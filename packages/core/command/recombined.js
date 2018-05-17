// @flow
import Command from "~/core/command/Command";
import { Duplicated, validateDuplicated } from "~/core/command/duplicated";
import { validateTransactedLike } from "~/core/command/transacted";

export const RECOMBINED = "RECOMBINED";

export class Recombined extends Command {
  type: "RECOMBINED";
  actions: ?Duplicated[];

  unrecognized: ?void;
}

export default function recombined (command: Recombined): Command {
  command.type = RECOMBINED;
  return validateRecombined(command);
}

export function validateRecombined (command: Recombined): Command {
  return validateTransactedLike(command, RECOMBINED, validateDuplicated);
}
