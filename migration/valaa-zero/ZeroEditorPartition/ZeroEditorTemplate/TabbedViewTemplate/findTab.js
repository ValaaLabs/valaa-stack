(item) => {
  const log = this.createLogger("findTab");
  log(0, ["(\n\t", item, "\n)"]);

  const tabs = item[Relatable.getIncomingRelations]("Valaa_Tab");
  log(1, ["tabs is", tabs]);

  for (let t = 0; t < tabs.length; t++) {
    const tab = tabs[t];
    log(1, ["Comparing tab", tab]);

    if (tab[Relation.source] === this) {
      log(1, ["Done - Found tab"]);
      return { tab: tab, index: t };
    }
  }

  log(1, ["Done - No tab found"]);
  return { tab: undefined, index: -1 };
};