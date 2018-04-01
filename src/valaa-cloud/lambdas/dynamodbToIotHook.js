import AWS from "aws-sdk";
import Configuration from "../src/Configuration";

// handler to be exported by this file
export function handler (
  lambdaEvent: Event,
  context: Object,
  callback: ((error: ?Error, result: any) => void)) {
  // need a parse method for the dynamodb data

  const dynToJson = AWS.DynamoDB.Converter.output;
  const iotData = new AWS.IotData({ endpoint: Configuration().iotEndpoint });


  for (const record of lambdaEvent.Records) {
    if (record.eventName === "INSERT") {
      const event = dynToJson({ M: record.dynamodb.NewImage });
      if (typeof event.eventJSONString !== "undefined") {
        event.event = JSON.parse(event.eventJSONString);
        delete event.eventJSONString;
      }
      const params = {
        topic: `partition/full/${event.partitionId}`,
        payload: JSON.stringify(event),
        qos: 0
      };

      iotData.publish(params, (err, data) => {
        if (err) {
          console.log(err);
          callback(err);
        } else {
          callback(null, data);
        }
      });
    }
  }
}
