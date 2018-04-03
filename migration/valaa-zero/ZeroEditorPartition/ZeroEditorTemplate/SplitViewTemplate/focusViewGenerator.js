(view) => {
  const log = this.createLogger("focusViewGenerator");
  log(0, ["({\n\tview:", view, "\n})"]);

  return () => {
    this.focusView({ view });
  };
};