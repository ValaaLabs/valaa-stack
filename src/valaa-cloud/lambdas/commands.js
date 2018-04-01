import EventTable from "../src/Database/EventTable";
import Configuration from "../src/Configuration";
import BlobValidator from "../src/Validation/Blob";

const eventTable = new EventTable(Configuration().tables.command);


console.log("Loading commands handler");

// handler to be exported by this file
export function handler (
  event: Event,
  context: Object,
  callback: ((error: ?Error, result: any) => void)) {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  // simple callback to return json
  const done = (err, res) => callback(null, {
    statusCode: err ? ((err instanceof ConflictError) ? 409 : 400) : 200,
    body: err ? err.message : JSON.stringify(res),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

  switch (event.httpMethod) {
    case "PUT":
      handlePut(event).then((data) => done(null, data), done);
      break;

    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
}

async function handlePut (lambdaEvent: Object) {
  const commandEnvelope = (typeof lambdaEvent.body === "string")
    ? JSON.parse(lambdaEvent.body) : lambdaEvent.body;

  const partitions = (commandEnvelope.partitionList)
    ? commandEnvelope.partitionList : [commandEnvelope];

  const pending = [];
  console.log(partitions);
  try {
    while (partitions.length) {
      const partitionInformation = partitions.shift();
      const previous = await validatelastId(partitionInformation);

      await validate(commandEnvelope);

      // @fixme(ppetermann) this only implements "single partition strategy" atm (4)
      const itemStatus = previous.itemStatus === "pending" ? "pending" : "accepted";

      const eventEnvelope = {
        partitionId: partitionInformation.partitionId,
        eventId: previous.eventId + 1,
        eventJSONString: JSON.stringify(commandEnvelope.command),
        // event: commandEnvelope.command,
        itemStatus
      };

      console.log(eventEnvelope);
      // we have to await here, as otherwise in case of an error we can't tell which ones
      // are the ones we've already written, and which ones are the ones that caused a conflict
      console.log(await eventTable.put(eventEnvelope));
      pending.push(eventEnvelope);
    }

    // @todo(ppetermann) figure out what we really want to return here
    return pending;
  } catch (error) {
    await failCommand(pending);
    console.log(error);
    if (error.code === "ConditionalCheckFailedException") {
      throw new ConflictError();
    }
    // rethrow unknown error
    console.log("while writing the events an unknown error occured");
    console.log(error);
    throw error;
  }
}

/**
 * currently a placeholder, this function is supposed to do rejections in case of
 * an failed transaction
 * @returns {Promise.<void>}
 */
async function failCommand (pending) {
  while (pending.length) {
    await eventTable.reject(pending.shift());
  }
}

/**
 * Error when previous id is outdated
 * @constructor
 */
function ConflictError () {
  this.name = "ConflictError";
  this.message = "Conflict: the previous id is outdated";
  this.stack = (new Error()).stack;
}

/**
 * returns the previous event for a command
 * this will throw an error if there is no previous event, with the exception of
 * if the lastEventId is -1, in which case it will return a fake event, so the first
 * one can be inserted
 * @param envelope
 * @returns {Promise}
 */
async function validatelastId (envelope) {
  // @fixme(ppetermann) do actual validation there)
  const table = new EventTable(Configuration().tables.command);
  return table.getEvent(envelope.partitionId, envelope.lastEventId);
}

ConflictError.prototype = Object.create(Error.prototype);
ConflictError.prototype.constructor = ConflictError;


function validate (envelope : Object) : Promise {
  const validators = [
    new BlobValidator()
  ];

  const promises = [];
  for (const validator of validators) {
    promises.push(validator.validate(envelope));
  }

  return Promise.all(promises);
}
