import EventTable from "../src/Database/EventTable";
import Configuration from "../src/Configuration";

console.log("Loading deletePartition handler");

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
      handleDelete(event).then((data) => done(null, data), done);
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
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

