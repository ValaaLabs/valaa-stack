console.log("Loading function");

// insert requires here

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

  switch (event.httpMethod) {
    case "DELETE":
      break;
    case "GET":
      break;
    case "POST":
      break;
    case "PUT":
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
}
