(data) => {
  const log = this.createLogger("focusTab");
  const item = data.item;
  log(0, ["({\n\titem:", item, "\n})"]);

  log(1, ["finding the relevant tab"]);
  const tabInfo = this.findTab(item);
  const index = tabInfo.index;
  const tab = tabInfo.tab;
  log(1, ["index is", index, "- tab is", tab]);

  // Bail out early if the item has no tabs
  if (!tab) {
    log(1, ["No tab found, bailing out early"]);
    return;
  }

  // Bail out if the current tab is already selected
  log(1, ["this.activeTab is", this.activeTab]);
  if (this.activeTab === tab) {
    log(1, ["The tab is already active, bailing out early"]);
    return;
  }

  // Focus the tab
  this.activeTab = tab;
  this.tabIndex = index;
  log(1, ["Focused the tab"]);

  // Signal the listeners
  log(1, "Emitting the signal");
  this.emitSignal(this.tabFocused, { tab: tab, item: item });

  log(1, "Done");
};
