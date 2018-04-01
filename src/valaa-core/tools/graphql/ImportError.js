export default class ImportError extends Error {
  constructor (error) {
    super();
    this.message = error;
    this.isImportError = true;
  }
}
