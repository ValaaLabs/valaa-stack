(data) => {
  const log = this.createLogger("closeTab");
  const error = this.createLogger("closeTab", console.error);
  const item = data.item;
  log(0, ["({\n\titem:", item, "\n})"]);

  log(1, ["finding the relevant tab"]);
  const tabInfo = this.findTab(item);
  const index = tabInfo.index;
  const tab = tabInfo.tab;
  log(1, ["index is", index, "- tab is", tab]);

  // Bail out early if the tab doesn't exist
  if (!tab) {
    error(1, ["no tab to close, bailing out early"]);
    return;
  }

  // Unfocus the tab if we just closed the active tab
  log(1, ["this.activeTab is", this.activeTab]);
  if (this.activeTab === tab) {
    log(1, ["the tab to be closed is the active one, unfocusing it"]);
    // TODO: Focus on another tab if any other tab still exists
    this.activeTab = null;
    this.tabIndex = -1;
  }

  // Destroy the tab
  log(1, ["destroying the tab"]);
  Relation.destroy(tab);

  // Signal the listeners
  log(1, ["emitting signal"]);
  this.emitSignal(this.tabClosed, { tabbedView: this, item: item });

  log(1, ["Done"]);
};
