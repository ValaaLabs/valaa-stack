(data) => {
  const log = this.createLogger("closeView");
  const view = data.view;
  log(0, ["({\n\tview:", view, "\n})"]);

  log(1, ["Emitting the signal"]);
  this.emitSignal(this.viewClosed, { view: view });

  if (view === this.activeView) {
    log(1, ["Closing the active view"]);
    this.activeView = null;
  }

  log(1, ["Destroying the view relation"]);
  Relation.destroy(view);

  log(1, ["Done"]);
}