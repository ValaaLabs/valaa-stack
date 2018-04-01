import { CREATED, isCreatedLike, isTransactedLike } from "~/valaa-core/command";
import isResourceType from "~/valaa-core/tools/graphql/isResourceType";
import { getRawIdFrom } from "~/valaa-core/ValaaReference";

import { createId, invariantify } from "~/valaa-tools";

// FIXME(iridian): This whole id generation schema is still a mess and needs to be fully rethought.
// FIXME(iridian): ID generation is simpler now, but a proper deterministic and linearly dependent
// schema would still be teh juice.

export default function createProcessCommandIdMiddleware (initialId, schema) {
  const previousId = { value: initialId };
  return (/* store */) => next => action => {
    if (!action.hasOwnProperty("commandId")) {
      action.timeStamp = Date.now();
      recurseAndAugmentWithIds(action, previousId, schema);
    }
    return next(action);
  };
}

function recurseAndAugmentWithIds (command, previousId, schema, transactionType) {
  if (!isCreatedLike(command)) {
    command.commandId = createId(command);
    previousId.id = command.commandId;
  } else {
    if (!command.id) {
      if ((command.type === CREATED) && checkIsCreateImmutable(schema, command)) {
        command.isImmutable = true;
        command.id = createId(command);
        delete command.isImmutable;
      } else if (command.id !== null) {
        command.id = createId(command);
        previousId.id = command.id;
      } else {
        invariantify((command.type === "DUPLICATED") && (transactionType === "RECOMBINED"),
            "command.id === null only permitted for a DUPLICATED directive inside RECOMBINED");
        return;
      }
    }
    command.commandId = getRawIdFrom(command.id);
  }
  if (isTransactedLike(command)) {
    command.actions.forEach(action =>
        recurseAndAugmentWithIds(action, previousId, schema, command.type));
  }
}

function checkIsCreateImmutable (schema, command) {
  const objectType = schema.getType(command.typeName);
  if (!objectType) {
    throw new Error(`No such type ${command.typeName} with command ${JSON.stringify(command)}`);
  }
  return !isResourceType(objectType);
}
