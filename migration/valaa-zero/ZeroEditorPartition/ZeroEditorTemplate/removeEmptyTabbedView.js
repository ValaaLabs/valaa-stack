(data) => {
  const log = this.createLogger("removeEmptyTabbedView");
  const error = this.createLogger("removeEmptyTabbedView", console.error);
  const tabbedView = data.tabbedView;
  log(0, ["({\n\ttabbedView:", tabbedView, "\n})"]);

  const tabs = tabbedView[Relatable.getRelations]("Valaa_Tab");
  log(1, ["tabs is", tabs]);

  if (tabs.length > 1) {
    log(1, ["tabs.length > 1, exiting function early"]);
    return;
  }

  // Get the view containing the TabbedView
  const views = tabbedView[Relatable.getIncomingRelations]("Valaa_SplitView_View");
  log(1, ["views is", views]);

  if (views.length === 0) {
    error(1, ["Strangely we have no views pointing to this TabbedView"]);
    return;
  }
  if (views.length > 1) {
    error(1, ["Strangely there are multiple views pointing to this TabbedView"]);
    return;
  }

  log(1, ["Asking the splitView to close the view"]);
  this.splitView.closeView({ view: views[0] });

  log(1, ["Destroying the TabbedView itself"]);
  Resource.destroy(tabbedView);

  log(1, ["Done"]);
};