import EventTable from "../src/Database/EventTable";
import Configuration, { FIRST_EVENT_ID } from "../src/Configuration";

console.log("Loading events handler");

const eventTable = new EventTable(Configuration().tables.command);


// handler to be exported by this file
export function handler (
  event: Event,
  context: Object,
  callback: ((error: ?Error, result: any) => void)) {
  // console.log('Received event:', JSON.stringify(event, null, 2));
  // simple callback to return json
  const done = (err, res) => callback(null, {
    statusCode: err ? 400 : 200,
    body: err ? err.message : JSON.stringify(res),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

  switch (event.httpMethod) {
    case "GET":
      handleGet(event).then((data) => done(null, data), done);
      break;
    case "DELETE":
      handleDelete(event).then((data) => done(null, data), done);
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
}

function handleGet (lambdaEvent: Object) {
  return new Promise((resolve, reject) => {
    if (lambdaEvent.queryStringParameters === undefined
      || lambdaEvent.queryStringParameters.partitionId === undefined
      || lambdaEvent.queryStringParameters.partitionId.length < 4) {
      // @todo(ppetermann) more sensible length for partition ids?
      reject(new Error("no partition id given"));
      return;
    }

    let lastEvaluatedKey = FIRST_EVENT_ID;
    if (lambdaEvent.queryStringParameters.lastEvaluatedKey !== undefined) {
      lastEvaluatedKey = lambdaEvent.queryStringParameters.lastEvaluatedKey;
    }
    let precedingEvent = FIRST_EVENT_ID;
    if (lambdaEvent.queryStringParameters.precedingEvent !== undefined) {
      precedingEvent = lambdaEvent.queryStringParameters.precedingEvent;
    }
    let lastEvent = FIRST_EVENT_ID;
    if (lambdaEvent.queryStringParameters.lastEvent !== undefined) {
      lastEvent = lambdaEvent.queryStringParameters.lastEvent;
    }


    const partitionId = lambdaEvent.queryStringParameters.partitionId;

    eventTable.getAllEvents(partitionId, lastEvaluatedKey, precedingEvent, lastEvent)
      .then((data) => {
        resolve(processResult(data));
      }, reject);
  });
}

function handleDelete (lambdaEvent: Object) {
  return new Promise((resolve, reject) => {
    if (lambdaEvent.queryStringParameters === undefined
    || lambdaEvent.queryStringParameters.partitionId === undefined
    || lambdaEvent.queryStringParameters.partitionId.length < 4) {
    // @todo(ppetermann) more sensible length for partition ids?
      reject(new Error("no partition id given"));
      return;
    }
    const partitionId = lambdaEvent.queryStringParameters.partitionId;

    // @todo(ppetermann) don't use this with live data, it might (will) cause unforseen behaviour.
    if (partitionId.substr(0, 5) !== "test-") {
      reject(new Error("partitionId doesn't start with test-"));
      return;
    }

    eventTable.deletePartition(partitionId).then((data) => { resolve(data); }, reject);
  });
}

// lets only return whitelisted fields
function processResult (data) {
  const result = {};

  result.Items = deSerialize(data.Items);
  result.Count = data.Count;
  if (data.LastEvaluatedKey) {
    result.LastEvaluatedKey = data.LastEvaluatedKey;
  }
  return result;
}

function deSerialize (items) {
  for (const item of items) {
    if (typeof item.eventJSONString !== "undefined") {
      item.event = JSON.parse(item.eventJSONString);
      delete item.eventJSONString;
    }
  }
  return items;
}
