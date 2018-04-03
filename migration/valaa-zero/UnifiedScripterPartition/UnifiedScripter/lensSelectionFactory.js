(lensName) => {
  const log = this.createLogger("lensSelectionFactory");
  log(0, ["(", lensName, ")"]);

  return () => {
    const log = this.createLogger("lensSelection");
    log(0, ["(", lensName, ")"]);

    this.activeLensName = lensName;
    log(1, ["Done"]);
  }
}