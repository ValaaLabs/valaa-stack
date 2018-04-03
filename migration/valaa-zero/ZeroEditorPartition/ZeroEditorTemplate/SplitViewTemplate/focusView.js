(data) => {
  const log = this.createLogger("focusView");
  const view = data.view;
  log(0, ["({\n\tview:", view, "\n})"]);

  this.activeView = view;

  log(1, ["Emitting the signal"]);
  this.emitSignal(this.viewFocused, { view: view });

  log(1, ["Done"]);
}