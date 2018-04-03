import InspireClient from "~/valaa-inspire/InspireClient";

// TODO(iridian): We get compilation errors due to CSS loader missing from jasmine config, or sth.

async function checkDatabaseExists (dbName) {
  const req = indexedDB.open(dbName, 1);
  let dbExisted = true;
  const openPromise = new Promise(resolve => {
    req.onupgradeneeded = () => {
      dbExisted = false;
    };
    req.onsuccess = event => {
      resolve(event.target.result);
    };
  });
  const db = await openPromise;
  return dbExisted ? db : null;
}

function checkDatabaseHasTable (db, tableName) {
  return !!Array.from(db.objectStoreNames).find(f => f === tableName);
}

async function checkDbExistsWithTables (dbName, tables) {
  const db = await checkDatabaseExists(dbName);
  if (!db) return false;
  let tablesExist = false;
  for (const table of tables) {
    tablesExist = await checkDatabaseHasTable(db, table);
    if (!tablesExist) break;
  }
  return tablesExist;
}

describe("Inspire Client", () => {
  let testClient;
  let views;

  beforeEach(async () => {
    testClient = new InspireClient();
    await testClient.initialize(
      "/valaa-inspire.revelation.json", // TODO(iridian): This is missing.
      {}
    );
    views = testClient.createAndConnectViewsToDOM({
      testMainView: {
        name: "Test Main",
        size: { width: 100, height: 1001 },
        container: document.body,
        rootId: "valaa-inspire--main-root",
        rootPartitionURI: "FIXME(iridian): this should be based on the revelation.json contents",
      },
    });
  });

  it("should have created a local database for the legacy partition", async () => {
    // TODO: make a test manifest instead of using inspire.valaa.com
    await views.testMainView;
    const dbExists = await checkDbExistsWithTables(
      `valaa-local:?id=745a7be22dacd2a1c1a20c2f5ad70c85d1b796f0`,
      ["medias", "commands", "events"]
    );
    expect(dbExists).toEqual(true);
  });

  it("should have created valaa-shared-content database", async () => {
    const dbExists = await checkDbExistsWithTables("valaa-shared-content", ["blobs", "buffers"]);
    expect(dbExists).toEqual(true);
  });

  it("should write commands to the command database before sending them upstream", async () => {
    const view = await views.testMainView;
    view.engine.create("Entity", { name: "Bob" });
    // TODO(iridian): Missing the whole test.
  });
});
