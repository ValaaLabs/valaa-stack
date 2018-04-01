import Configuration from "../src/Configuration";
import EventTable from "../src/Database/EventTable";


// handler to be exported by this file
export function handler (
  event: Event,
  context: Object,
  callback: ((error: ?Error, result: any) => void)) {
  // console.log('Received event:', JSON.stringify(event, null, 2));

  // simple callback to return json
  const done = (err, res) => callback(null, {
    statusCode: err ? "400" : "200",
    body: err ? err.message : JSON.stringify(res),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const eventTable = new EventTable(Configuration().tables.command);

  switch (event.httpMethod) {
    case "GET":
      Promise.all([
        eventTable.create(),
      ]).then(
        (data) => done(null, { response: data }),
        (err) => done(new Error(err))
      );
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
}

