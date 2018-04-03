(index) => {
  const log = this.createLogger("focusTabByIndex");
  log(0, ["(", index, ")"]);

  const tabs = this[Relatable.getRelations]("Valaa_Tab");
  log(1, ["tabs is", tabs]);

  if (tabs.length === 0) {
    log(1, ["No tabs to focus, bailing out early"]);
    return;
  }

  // Use wrap around for tab selection
  const tabIndex = (tabs.length + index) % tabs.length;

  this.tabIndex = tabIndex;
  log(1, ["tabIndex is", tabIndex]);

  this.activeTab = tabs[tabIndex];
  log(1, ["activeTab is", tabs[tabIndex]]);

  const item = this.activeTab[Relation.target];
  log(1, ["Item is", item]);

  this.emitSignal(this.tabFocused, { tab: this.activeTab, item: item });
  log(1, ["Done"]);
}