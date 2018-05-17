// @flow
import Command from "~/core/command/Command";
import { validateTransactedLike } from "~/core/command/transacted";

export const FROZEN = "FROZEN";

export class Frozen extends Command {
  type: "FROZEN";
  actions: ?Command[]; // alias name for sub-command

  unrecognized: ?void;
}

export default function frozen (command: Frozen): Command {
  command.type = FROZEN;
  return validateFrozen(command);
}

export function validateFrozen (command: Frozen, recursiveActionValidator: ?Function): Command {
  return validateTransactedLike(command, FROZEN, recursiveActionValidator);
}
