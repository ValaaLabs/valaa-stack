(signal, listener, slot) => {
  const log = this.createLogger("registerListener");
  const info = this.createLogger("registerListener", console.info);
  const error = this.createLogger("registerListener", console.error);
  log(0, [
    "({\n\tsignal:  ", signal,
    "\n\tlistener:", listener,
    "\n\tslot:  ", slot,
    "\n})"]);

  log(1, ["Done"]);
};