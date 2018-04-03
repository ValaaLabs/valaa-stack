() => {
  console.log("createSplitView()");
  if (!this.splitView) {
    const SplitViewTemplate = this.splitViewTemplate;
    console.log("\tcreateSplitView - Grabbed the Split View Template:", SplitViewTemplate[Valaa.name], SplitViewTemplate);
    this.splitView = new SplitViewTemplate({
      owner: this,
      name: SplitViewTemplate[Valaa.name] + " instance",
    });
    console.log("\tcreateSplitView - Instanced the Split View Template:", this.splitView[Valaa.name], this.splitView);
  }
  return this.splitView;
}