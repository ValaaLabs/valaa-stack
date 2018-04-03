(signal, data) => {
  const log = this.createLogger("emitSignal");
  log(0, ["({\n\tsignal:", signal, "\n\tdata:", data, "\n})"]);

  log(1, ["Done"]);
};