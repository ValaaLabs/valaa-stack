// @flow

/**
 * This file describes a type that encapsulates either all possibly relevant scope of IndexedDB or
 * its mock for jest tests in FakeIndexedDB.
 * TODO: Double-check if this is the correct way to describe the types
 */

export type DatabaseAPI = {
  IndexedDB: IDBFactory,
  IDBFactory: Function,
  IDBOpenDBRequest: Function,
  IDBDatabase: Function,
  IDBTransaction: Function,
  IDBRequest: Function,
  IDBObjectStore: Function,
  IDBIndex: Function,
  IDBCursor: Function,
  IDBCursorWithValue: Function,
  IDBKeyRange: Function,
};
