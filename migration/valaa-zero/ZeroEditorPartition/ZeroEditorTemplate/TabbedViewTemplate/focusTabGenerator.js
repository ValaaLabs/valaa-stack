(tab) => {
  const log = this.createLogger("focusTabGenerator");
  const error = this.createLogger("focusTabGenerator", console.error);
  log(0, ["(\n\t", tab, "\n)"]);

  if (!tab) {
    error(1, ["the tab does not exist, returning a no-op"]);
    return () => {};
  }
  return () => {
    this.focusTab({ item: tab[Relation.target] });
  };
};
