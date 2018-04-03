(tab) => {
  const log = this.createLogger("selectTabLensGenerator");
  const error = this.createLogger("selectTabLensGenerator", console.error);
  log(0, ["(\n\t", tab, "\n)"]);

  if (!tab) {
    error(1, ["the tab does not exist, returning a no-op"]);
    return () => {};
  }
  return (data) => {
    const log = this.createLogger("selectTabLens");
    const value = data.target.value;
    log(0, ["({\n\ttab:", tab, "\n\tvalue:", value, "\n})"]);

    const builtin = value.split("VALAA Builtin - ")[1];
    log(1, ["builtin is", builtin]);

    if (builtin) {
      log(1, ["using a builtin lens"]);
      tab.builtinLens = builtin;
      tab.customLens = null;
    } else {
      log(1, ["using a custom lens"]);
      tab.builtinLens = null;
      tab.customLens = value;
    }
    log(1, "Done");
  };
};
