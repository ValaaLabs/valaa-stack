import { createPassageFromAction, createUniversalizableCommand, getActionFromPassage }
    from "~/valaa-core/redux/Bard";

import Command, { transacted } from "~/valaa-core/command";
import type { Corpus } from "~/valaa-core/Corpus";

import { ClaimResult } from "~/valaa-prophet/api/Prophet";
import Prophecy from "~/valaa-prophet/api/Prophecy";
import type { Transaction } from "~/valaa-prophet/api/Transaction";

import { dumpObject, invariantify } from "~/valaa-tools";

let transactionCounter = 0;

export default class TransactionInfo {
  constructor (transaction: Transaction, customCommand: Object) {
    this.transaction = transaction;
    this.name = transaction.corpus.nameContainer
        && `${transaction.corpus.nameContainer.name}/Transaction#${transactionCounter += 1}`;
    this.stateBefore = transaction.getState();
    this.stateAfter = null;
    // restrictedActions is set to null when the transaction has been committed.
    this.restrictedActions = [];
    this.transacted = transacted({ actions: [] });
    this.storyPassages = [];
    this.universalPartitions = {};
    this.customCommand = customCommand;
    this.resultPromises = [];
    transaction.transactionDepth = 1;
    // With this here and couple lines in Corpus:fork we have fully isolated forking
    // for all valk operations practically for free for our tx.
    // This also updates the forked corpus immediately for every command.
    transaction.corpus = transaction.corpus.fork({ nameOverride: this.name });
  }

  isCommittable () {
    return this.restrictedActions;
  }

  isFastForwardFrom (previousState: Object) {
    return this.stateBefore === previousState;
  }

  createNestedTransaction (transaction: Transaction, customCommand?: Object) {
    const nestedTransaction = Object.create(transaction);
    nestedTransaction.transactionDepth = transaction.transactionDepth + 1;
    // Custom command alters the custom command of the whole transaction.
    this.setCustomCommand(customCommand, "creating new nested transaction");
    nestedTransaction.releaseTransaction = (releaseCustomCommand) => {
      // Nested transactions only set the custom command, only outermost transaction commits.
      this.setCustomCommand(releaseCustomCommand, "releasing nested transaction");
    };
    return nestedTransaction;
  }

  setCustomCommand (customCommandCandidate: any, context: string) {
    if (typeof customCommandCandidate === "undefined") return;
    invariantify(typeof this.customCommand === "undefined",
        `While ${context} '${this.name
            }' trying to override an existing customCommand`,
        "\n\tin transactionInfo:", this,
        "\n\toverriding custom command candidate:", customCommandCandidate);
    this.customCommand = customCommandCandidate;
  }

  claim (restrictedCommand: Command): ClaimResult {
    try {
      if (!this.restrictedActions) {
        throw new Error(`Transaction '${this.name}' has already been ${
                this.finalTransactedLike ? "committed" : "aborted"
            }, when trying to add an action to it`);
      }
      // What goes on here is an incremental construction and universalisation of a TRANSACTED
      // command whenever a new restrictedCommand comes in, via dispatching the on-going
      // info.transacted only containing that particular command. Once the transaction is finally
      // committed, the pieces are put together in a complete, universal TRANSACTED.
      const index = this.restrictedActions.length;
      this.restrictedActions.push(restrictedCommand);

      const previousState = this.transaction.state;
      const story = this.transaction.corpus.dispatch({
        ...this.transacted,
        actions: [createUniversalizableCommand(restrictedCommand)],
      });
      this.storyPassages.push(story.passages[0]);
      Object.assign(this.universalPartitions, story.partitions);

      const state = this.transaction.corpus.getState();
      this.transaction.setState(state);

      this.resultPromises.push(null);
      const result = new Promise((succeed, fail) =>
          (this.resultPromises[index] = { succeed, fail }));
      return {
        prophecy: new Prophecy(story.passages[0], state, previousState, restrictedCommand),
        getFinalEvent: () => result,
      };
    } catch (error) {
      throw this.transaction.wrapErrorEvent(error, `transaction.claim(${this.name})`,
          "\n\trestrictedCommand:", ...dumpObject(restrictedCommand),
      );
    }
  }

  commit (commitCustomCommand: ?Object): ClaimResult {
    let command;
    try {
      if (!this.restrictedActions) {
        throw new Error(`Transaction '${this.name}' has already been ${
                this.finalTransactedLike ? "committed" : "aborted"
            }, when trying to commit it again`);
      }
      this.setCustomCommand(commitCustomCommand, "committing transaction");
      this.stateAfter = this.transaction.getState();

      this.transacted.actions = this.restrictedActions;
      this.restrictedActions = null;

      this.finalTransactedLike = !this.customCommand
          ? this.transacted
          : this.customCommand(this.transacted);
      if (!this.customCommand && !this.finalTransactedLike.actions.length) {
        const universalNoOpCommand = createUniversalizableCommand(this.finalTransactedLike);
        universalNoOpCommand.partitions = {};
        return {
          prophecy: new Prophecy(universalNoOpCommand, undefined, undefined,
              this.finalTransactedLike),
          getFinalEvent () { return universalNoOpCommand; },
        };
      }
      const result = this.transaction.prophet.claim(
          this.finalTransactedLike, { transactionInfo: this });

      Promise.resolve(result.getFinalEvent()).then(
        // TODO(iridian): Implement returning results. What should they be anyway?
        innerResult => this.resultPromises.forEach((promise, index) =>
            promise.succeed(innerResult.actions && innerResult.actions[index])),
        failure => this.resultPromises.forEach((promise) =>
            promise.fail(failure)),
      );
      this.commitResult = result;
      return result;
    } catch (error) {
      throw this.transaction.wrapErrorEvent(error, `transaction(${this.name}).commit()`,
          "\n\tcommand:", ...dumpObject(command),
      );
    }
  }

  abort () {
    if (!this.restrictedActions && this.finalTransactedLike) {
      throw new Error(`Transaction '${this.name
          }' has already been committed, when trying to abort it`);
    }
    this.restrictedActions = null;
  }

  releaseTransaction (releaseCustomCommand: ?Object) {
    this.setCustomCommand(releaseCustomCommand, "releasing transaction");
    // If the transaction has not yet been explicitly committed or discarded, commit it now.
    if (this.isCommittable()) this.commit();
    return this.commitResult;
  }


  /**
   * Tries to fast-forward this transaction on top of the given targetCorpus.
   * Returns a story of the transaction if successfull, undefined if fast forward was not possible.
   *
   * @param {Corpus} corpus
   * @returns
   *
   * @memberof TransactionInfo
   */
  tryFastForwardOnCorpus (targetCorpus: Corpus) {
    // this.logEvent(`Committing fast-forward transaction '${transactionInfo.name}'`);
    const previousState = targetCorpus.getState();
    if (!this.isFastForwardFrom(previousState)) return undefined;
    targetCorpus.reinitialize(this.stateAfter);
    // this.logEvent(`Committed '${transactionInfo.name}'`, story);
    const story = createPassageFromAction({
      ...this.finalTransactedLike,
      actions: this.storyPassages.map(passage => getActionFromPassage(passage)),
      partitions: this.universalPartitions,
    });
    story.passages = this.storyPassages;
    return story;
  }
}
