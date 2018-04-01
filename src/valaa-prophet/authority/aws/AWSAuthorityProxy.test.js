jest.mock("reqwest");

/* eslint-disable import/imports-first */
import { createTestPartitionURIFromRawId } from "~/valaa-core/tools/PartitionURI";

import AWSAuthorityProxy, { createTestUpstream }
    from "~/valaa-prophet/authority/aws/AWSAuthorityProxy";
import AWSPartitionConnection from "~/valaa-prophet/authority/aws/AWSPartitionConnection";
/* eslint-enable import/imports-first */

describe("AWSAuthorityProxy tests", () => {
  it("Initializes upstream", () => {
    const upstream = createTestUpstream();
    expect(upstream instanceof AWSAuthorityProxy).toBe(true); // TODO: .toBeInstanceOf
  });

  xit("Fetches the correct Partition Info", () => {
    // To be implemented once _fetchPartitionInfo is live
  });

  it("Provides an AWSPartitionConnection", async () => {
    const upstream = createTestUpstream();
    const connection = await upstream.acquirePartitionConnection(
        createTestPartitionURIFromRawId("test"));
    expect(connection instanceof AWSPartitionConnection).toBe(true); // TODO: .toBeInstanceOf
    connection.releaseConnection();
  });

  describe("addMiddleware", () => {
    it("Adds given middleware to the middleware list", () => {
      const upstream = createTestUpstream();
      const mockMiddleware = () => {};
      upstream.addMiddleware(mockMiddleware);
      expect(upstream.middleware.length).toEqual(1);
      expect(upstream.middleware[0]).toEqual(mockMiddleware);
    });
  });

  describe("removeMiddleware", () => {
    it("Removes the given middleware function from the middleware list", () => {
      const upstream = createTestUpstream();
      const mockMiddleware = () => {};
      upstream.addMiddleware(mockMiddleware);
      upstream.addMiddleware(() => {});
      upstream.removeMiddleware(mockMiddleware);
      expect(upstream.middleware.length).toEqual(1);
      expect(upstream.middleware[0]).not.toEqual(mockMiddleware);
    });
  });

  describe("applyMiddleware", () => {
    it("should overwrite the envelope with mutated versions returned by middleware", async () => {
      const upstream = createTestUpstream();
      upstream.addMiddleware((context, envelope) => {
        envelope.test = "hello";
        return envelope;
      });
      upstream.addMiddleware((context, envelope) => {
        envelope.test2 = "hello there";
        return envelope;
      });
      const mockEnvelope = { derp: true };
      const mutatedEnvelope = await upstream.applyMiddleware(mockEnvelope);
      expect(mutatedEnvelope.derp).toEqual(true);
      expect(mutatedEnvelope.test).toEqual("hello");
      expect(mutatedEnvelope.test2).toEqual("hello there");
    });

    it("shouldnt overwrite the envelope if the middleware does not return an object", async () => {
      const upstream = createTestUpstream();
      upstream.addMiddleware(() => "fdsklflsdf");
      upstream.addMiddleware((context, envelope) => {
        envelope.test = "hello";
        return envelope;
      });
      upstream.addMiddleware(() => null);
      upstream.addMiddleware(() => undefined);

      const mockEnvelope = { derp: true };
      const mutatedEnvelope = await upstream.applyMiddleware(mockEnvelope);
      expect(mutatedEnvelope.derp).toEqual(true);
      expect(mutatedEnvelope.test).toEqual("hello");
    });

    it("should await if middleware returns a promise", async () => {
      const upstream = createTestUpstream();
      upstream.addMiddleware((context, envelope) => {
        envelope.test = "hello";
        return envelope;
      });
      upstream.addMiddleware((context, envelope) =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve(Object.assign({ test2: "hello there" }, envelope));
          }, 100);
        })
      );
      const mockEnvelope = { derp: true };
      const mutatedEnvelope = await upstream.applyMiddleware(mockEnvelope);
      expect(mutatedEnvelope.derp).toEqual(true);
      expect(mutatedEnvelope.test).toEqual("hello");
      expect(mutatedEnvelope.test2).toEqual("hello there");
    });
  });

  describe("claim", () => {
    it("applies middleware before sending the command", () => {
      const upstream = createTestUpstream();
      upstream.applyMiddleware = jest.fn(cmd => cmd);
      const fakeCommand = {
        iAmFake: true,
        partitions: { test: { eventId: 1, partitionAuthorityURI: "valaa-test:" } }
      };
      upstream.claim(fakeCommand, { timed: false });
      expect(upstream.applyMiddleware.mock.calls.length).toBe(1);
      expect(upstream.applyMiddleware).toBeCalledWith({
        command: fakeCommand,
        partitionList: [{ lastEventId: 0, partitionId: "test" }],
      });
    });
  });
});
