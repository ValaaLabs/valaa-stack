import { createTestPartitionURIFromRawId } from "~/valaa-core/tools/PartitionURI";

import { createTestUpstream } from "~/valaa-prophet/authority/aws/AWSAuthorityProxy";

// import AWSPartitionConnection from "~/valaa-prophet/authority/aws/AWSPartitionConnection";

function makeEvent (eventId, partitionId, payload) {
  const eventEnvelope = {
    eventId,
    partitionId,
    event: {
      id: partitionId,
      type: "CREATED",
      data: payload,
      partitions: { [partitionId]: { eventId, partitionAuthorityURI: "valaa-test:" } },
    },
    partitionList: [{ [partitionId]: { eventId, partitionAuthorityURI: "valaa-test:" } }]
  };
  return JSON.stringify(eventEnvelope);
}

const testPartitionURI = createTestPartitionURIFromRawId("test");

describe("AWSPartitionConnection tests", () => {
  it("Delivers events to downstream callback", async () => {
    const upstream = createTestUpstream();

    let testResult = null;
    const testPayload1 = "testdata";

    const connection = await upstream.acquirePartitionConnection(testPartitionURI, {
      callback (event) { testResult = event.data; }
    });

    connection._processIoTMessage(makeEvent(0, connection.config.partition.id, testPayload1));
    expect(testResult).toBe(testPayload1);
  });

  it("Doesn't playback events with a gap in ids", async () => {
    const upstream = createTestUpstream();

    const testResult = [];
    const testPayloads = [0, 1, 3, 4]; // intentionally missing value 2

    const connection = await upstream.acquirePartitionConnection(testPartitionURI, {
      callback (event) { testResult.push(event.data); }
    });

    for (const payload of testPayloads) {
      connection._processIoTMessage(makeEvent(payload, connection.config.partition.id, payload));
    }
    expect(testResult).toEqual([0, 1]);
  });

  it("Plays back received events in correct order", async () => {
    const upstream = createTestUpstream();

    const testResult = [];
    const testPayloads = [0, 1, 3, 4, 2]; // intentionally wrong order

    const connection = await upstream.acquirePartitionConnection(testPartitionURI, {
      callback (event) { testResult.push(event.data); }
    });

    for (const payload of testPayloads) {
      connection._processIoTMessage(makeEvent(payload, connection.config.partition.id, payload));
    }
    expect(testResult).toEqual([0, 1, 2, 3, 4]);
  });

  it("Rejects duplicate events", async () => {
    const upstream = createTestUpstream();

    const testResult = [];

    const connection = await upstream.acquirePartitionConnection(testPartitionURI, {
      callback (event) { testResult.push(event.data); }
    });

    connection._processIoTMessage(makeEvent(0, connection.config.partition.id, "test0-ok"));
    connection._processIoTMessage(makeEvent(1, connection.config.partition.id, "test1-ok"));
    const duplicateResult = connection._processIoTMessage(
        makeEvent(1, connection.config.partition.id, "test1-fail"));
    connection._processIoTMessage(makeEvent(2, connection.config.partition.id, "test2-ok"));

    expect(duplicateResult).toEqual(false);
    expect(testResult).toEqual(["test0-ok", "test1-ok", "test2-ok"]);
  });

  it("Cleans up the pending events", async () => {
    const upstream = createTestUpstream();

    const testResult = [];

    const connection = await upstream.acquirePartitionConnection(testPartitionURI, {
      callback (event) { testResult.push(event.data); }
    });
    connection._processIoTMessage(makeEvent(0, connection.config.partition.id, "test0-ok"));

    // put two events that should get queued
    connection._processIoTMessage(makeEvent(3, connection.config.partition.id, "test2-ok"));
    connection._processIoTMessage(makeEvent(2, connection.config.partition.id, "test1-ok"));
    expect(Object.keys(connection._pendingEvents).length).toBe(2);

    // provide the event that triggers playback and cleanup of eventmap
    connection._processIoTMessage(makeEvent(1, connection.config.partition.id, "test0-ok"));
    expect(Object.keys(connection._pendingEvents).length).toBe(0);
  });
});
