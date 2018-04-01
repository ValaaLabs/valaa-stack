// @flow

import Command from "~/valaa-core/command";

import { createTestPartitionURIFromRawId, createPartitionURI }
    from "~/valaa-core/tools/PartitionURI";

import ScriptTestHarness, { createScriptTestHarness } from "~/valaa-script/test/ScriptTestHarness";

import { FalseProphet, Oracle, Prophecy, Scribe } from "~/valaa-prophet";
import ProphetTestAPI from "~/valaa-prophet/test/ProphetTestAPI";

import { getDatabaseAPI } from "~/valaa-tools/indexedDB/getFakeDatabaseAPI";
import { openDB } from "~/valaa-tools/html5/InMemoryIndexedDBUtils";

export function createProphetTestHarness (options: Object, ...commandBlocks: any) {
  const ret = createScriptTestHarness({
    name: "Prophet Test Harness", ContentAPI: ProphetTestAPI, TestHarness: ProphetTestHarness,
    ...options,
  });
  commandBlocks.forEach(commandBlock => commandBlock.forEach(command =>
      ret.claim(command)));
  return ret;
}

export async function createProphetOracleHarness (options: Object, ...commandBlocks: any) {
  const ret = createProphetTestHarness(
      { name: "Prophet Oracle Harness", enableOracle: true, ...options });
  ret.testPartitionConnection = await ret.testPartitionConnection;
  if (options.acquirePartitions) {
    const partitionURIs = options.acquirePartitions.map(
        partitionId => createPartitionURI("valaa-test:", partitionId));
    const connections = partitionURIs.map(uri => ret.oracle.acquirePartitionConnection(uri));
    await Promise.all(connections);
  }
  for (const block of commandBlocks) {
    await Promise.all(block.map(command => ret.claim(command).getFinalEvent()));
  }
  return ret;
}

export default class ProphetTestHarness extends ScriptTestHarness {
  constructor (options: Object) {
    super(options);
    if (options.enableOracle) {
      this.scribe = createScribe();
      this.oracle = createOracle(this.scribe);
      this.upstream = this.oracle;
      this.cleanup = () => clearOracleScribeDatabases(this.oracle);
    } else {
      this.upstream = new MockProphet();
      this.cleanup = () => undefined;
    }
    this.prophet = new FalseProphet({
      name: "Test FalseProphet",
      logger: this.logger, schema: this.schema, corpus: this.corpus, upstream: this.upstream,
    });

    this.testPartitionURI = createTestPartitionURIFromRawId("test_partition");
    this.testPartitionConnection = this.prophet.acquirePartitionConnection(this.testPartitionURI);
  }

  claim (...rest: any) {
    return this.prophet.claim(...rest);
  }
}

export function createScribe (commandCountCallback: any) {
  return new Scribe({
    name: "Test Scribe",
    databaseAPI: getDatabaseAPI(),
    commandCountCallback,
  });
}

export async function clearScribeDatabases (otherConnections: Object[] = []) {
  const partitionURIs = ["test-partition:", "valaa-shared-content"];
  partitionURIs.push(...otherConnections);
  for (const uri of partitionURIs) {
    const database = await openDB(uri);
    for (const table of database.objectStoreNames) {
      const transaction = database.transaction([table], "readwrite");
      const objectStore = transaction.objectStore(table);
      objectStore.clear();
    }
  }
}

export function createOracle (scribe: Scribe) {
  return new Oracle({
    name: "Test Oracle",
    getAuthorityURLFromPartitionURI () { return null; },
    createAuthorityProxy () {
      throw new Error("test harness setup error, check ProphetTestHarness.js");
    },
    scribe,
  });
}

export function clearOracleScribeDatabases (oracle: Oracle) {
  return clearScribeDatabases(Object.values(oracle.getFullPartitionConnections())
      .map(connection => connection.partitionURI().toString()));
}


class MockProphet {
  addFollower (/* falseProphet */) {
    const connectors = {};
    return connectors;
  }

  claim (command: Command) {
    return {
      prophecy: new Prophecy(command),
      getFinalEvent: () => Promise.resolve(command),
    };
  }

  acquirePartitionConnection () { return null; }
}
