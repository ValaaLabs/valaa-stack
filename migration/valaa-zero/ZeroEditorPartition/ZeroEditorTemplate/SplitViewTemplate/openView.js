(data) => {
  const log = this.createLogger("openView");
  const content = data.content;
  log(0, ["({\n\tcontent:", content, "\n})"]);

  const view = new Relation({
    name: "Valaa_SplitView_View",
    target: content,
    owner: this,
  });
  log(1, ["view is", view]);

  this.activeView = view;

  log(1, ["emitting the signal"]);
  this.emitSignal(this.viewOpened, { view: view });

  log(1, ["Done"]);
}