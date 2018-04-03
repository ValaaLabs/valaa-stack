() => {
  const log = this.createLogger("createSplitView");
  log(0, ["()"]);

  if (!this.splitView) {
    log(1, ["splitView doesn't yet exist, instancing it"]);
  
    const SplitViewTemplate = this.splitViewTemplate;
    log(1, ["SplitViewTemplate is", SplitViewTemplate[Valaa.name], "/", SplitViewTemplate]);

    this.splitView = new SplitViewTemplate({
      owner: this,
      name: SplitViewTemplate[Valaa.name] + " instance",
    });
    log(1, ["Instanced the SplitView"]);
  }
  log(1, ["splitView is", this.splitView[Valaa.name], "/", this.splitView]);
  return this.splitView;
}