(data) => {
  const log = this.createLogger("openTab");
  const item = data.item;
  log(0, ["({\n\titem:", item, "\n})"]);

  log(1, ["finding the relevant tab"]);
  const tabInfo = this.findTab(item);
  let index = tabInfo.index;
  let tab = tabInfo.tab;
  log(1, ["index is", index, "- tab is", tab]);

  // Open a new tab if none yet exists
  if (!tab) {
    log(1, ["Creating a new tab"]);

    index = this[Relatable.getRelations]("Valaa_Tab").length;
    log(1, ["New tab index is", index]);
    
    let builtinLens = null;
    let customLens = null;

    log(1, ["Introspecting the item interface"]);
    if (item[Resource.hasInterface]("Media")) {
      builtinLens = "Text Editor";
    } else if (item.EDITOR_LENS) {
      customLens = "EDITOR_LENS";
    } else {
      builtinLens = "Properties Panel";
    }
    log(1, ["builtinLens is", builtinLens]);
    log(1, ["customLens is ", customLens]);

    tab = new Relation({
      name: "Valaa_Tab",
      owner: this,
      target: item,
      properties: {
        builtinLens: builtinLens,
        customLens: customLens,
      }
    });
    log(1, ["New tab is", tab]);
  }

  // Focuses the tab
  log(1, ["focusing the tab"]);
  if (tab !== this.activeTab) {
    this.activeTab = tab;
    this.tabIndex = index;
    this.emitSignal(this.tabFocused, { tab: tab, item: item });
  }

  log(1, "Emitting the signal");
  this.emitSignal(this.tabOpened, { tab: tab, item: item });

  log(1, "Done");
};
