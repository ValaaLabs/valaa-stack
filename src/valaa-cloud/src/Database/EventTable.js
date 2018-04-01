import AWS from "aws-sdk";
import { FIRST_EVENT_ID } from "../Configuration";

export default class EventTable {
  constructor (TableConfig: Object) {
    AWS.config.dynamodb = {
      region: TableConfig.region,
      endpoint: TableConfig.endpoint
    };
    this.name = TableConfig.name;
  }

  /**
   * create a new table at dynamodb
   * @returns {Promise}
   */
  create () {
    const dynamoDB = new AWS.DynamoDB();
    const params = {
      TableName: this.name,
      KeySchema: [
        { AttributeName: "partitionId", KeyType: "HASH" },  // Partition key
        { AttributeName: "eventId", KeyType: "RANGE" }  // Sort key
      ],
      // only fields that are used with keys can be part of this
      AttributeDefinitions: [
        { AttributeName: "partitionId", AttributeType: "S" },
        { AttributeName: "eventId", AttributeType: "N" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    };
    dynamoDB.createTable(params).promise();
  }

  put (envelope: Object) {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: this.name,
      Item: envelope,
      Expected: {
        eventId: {
          Exists: false
        }
      }
    };
    return documentClient.put(params).promise();
  }

  reject (envelope: Object) {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: this.name,
      Key: {
        partitionId: envelope.partitionId,
        eventId: envelope.eventId
      },
      UpdateExpression: "set itemStatus = :s",
      ExpressionAttributeValues: {
        ":s": "rejected"
      }
    };

    return documentClient.update(params).promise();
  }


  /**
   * @returns {Promise}
   */
  getEvent (partitionId: string, eventId: number) {
    return new Promise((resolve, reject) => {
      const documentClient = new AWS.DynamoDB.DocumentClient();

      const params = {
        TableName: this.name,
        Key: {
          partitionId,
          eventId
        }
      };

      if (eventId === FIRST_EVENT_ID) {
        resolve({ eventId: FIRST_EVENT_ID, itemStatus: "accepted" });
      } else {
        documentClient.get(params, (err, data) => {
          if (err) {
            reject(err);
          } else {
            if (data.Item === undefined) {
              reject(new Error("previous event doesn't exist"));
              return;
            }
            resolve(data.Item);
          }
        });
      }
    });
  }

  getAllEvents (
    partitionId: string,
    lastEvaluatedKey: number,
    precedingEvent: number,
    lastEvent: number) {
    const documentClient = new AWS.DynamoDB.DocumentClient();

    const params = {
      TableName: this.name,
      KeyConditionExpression: "#partition = :partitionId",
      ExpressionAttributeNames: {
        "#partition": "partitionId"
      },
      ExpressionAttributeValues: {
        ":partitionId": partitionId
      }
    };

    if (lastEvaluatedKey > FIRST_EVENT_ID) {
      params.ExclusiveStartKey = {
        partitionId,
        eventId: parseInt(lastEvaluatedKey, 10)
      };
    }

    if (precedingEvent > FIRST_EVENT_ID && lastEvent === FIRST_EVENT_ID) {
      params.KeyConditionExpression += " AND eventId > :precedingEventId";
      params.ExpressionAttributeValues[":precedingEventId"] = parseInt(precedingEvent, 10);
    }

    if (lastEvent > FIRST_EVENT_ID && precedingEvent === FIRST_EVENT_ID) {
      params.KeyConditionExpression += " AND eventId <= :lastEventId";
      params.ExpressionAttributeValues[":lastEventId"] = parseInt(lastEvent, 10);
    }

    if (lastEvent > FIRST_EVENT_ID && precedingEvent > FIRST_EVENT_ID) {
      params.KeyConditionExpression += " AND eventId BETWEEN :precedingEventId AND :lastEventId";
      params.ExpressionAttributeValues[":precedingEventId"] = precedingEvent + 1;
      params.ExpressionAttributeValues[":lastEventId"] = parseInt(lastEvent, 10);
    }

    return documentClient.query(params).promise();
  }

  /**
   * remove/delete table from dynamodb
   * @returns {Promise}
   */
  remove () {
    const dynamoDB = new AWS.DynamoDB();
    const params = {
      TableName: this.name
    };

    return dynamoDB.deleteTable(params).promise();
  }

  /**
   * delete all items of the given partition
   * @param partitionId
   * @returns {Promise}
   */
  deletePartition (partitionId) {
    const synced = async () => {
      while (await deleteResults(this.name, await this.getAllEvents(
          partitionId, FIRST_EVENT_ID, FIRST_EVENT_ID, FIRST_EVENT_ID, FIRST_EVENT_ID))) {
      // the expression is the loop.
      }
      return true;
    };

    return synced();
  }
}


/**
 * delete the results of a getAllEvents
 * @param tableName
 * @param data
 * @returns {Promise.<boolean>}
 */
async function deleteResults (tableName: string, data: Object) {
  const documentClient = new AWS.DynamoDB.DocumentClient();
  let hasMore = false;
  let deleteRequests = [];

  if (data.Items.length) {
    for (const item of data.Items) {
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            partitionId: item.partitionId,
            eventId: item.eventId
          }
        }
      });
    }

    if (deleteRequests.length > 25) {
      deleteRequests = deleteRequests.slice(0, 25);
      hasMore = true;
    }

    const params = {
      RequestItems: {

      }
    };
    params.RequestItems[tableName] = deleteRequests;
    console.log(params);
    await documentClient.batchWrite(params).promise();
  }

  return (!!data.LastEvaluatedKey && data.LastEvaluatedKey !== FIRST_EVENT_ID) || hasMore;
}
