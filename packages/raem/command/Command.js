// @flow
import { invariantifyNumber, invariantifyObject } from "~/tools/invariantify";
import { invariantifyId } from "~/raem/ValaaReference";

export default class Command {
  +type: string;
  version: ?string;
  commandId: string;
  partitions: ?Object;
  parentId: ?string;
  timeStamp: ?number;
}

export function validateCommandInterface (command: Command) {
  const { type, version, commandId, partitions, parentId, timeStamp } = command;

  invariantifyId(version, `${type}.version`, { allowUndefined: true },
      "\n\tcommand:", command);
  invariantifyId(commandId, `${type}.commandId`, { allowUndefined: true },
      "\n\tcommand:", command);
  invariantifyObject(partitions, `${type}.partitions`, { allowUndefined: true, allowEmpty: true },
      "\n\tcommand:", command);
  invariantifyId(parentId, `${type}.parentId`, { allowUndefined: true },
      "\n\tcommand:", command);
  invariantifyNumber(timeStamp, `${type}.timeStamp`, { allowUndefined: true },
      "\n\tcommand:", command);
}
