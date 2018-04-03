<div className={VS`VSS(head.stylesheet, "root")`}>
  <If test={VALK.firstRelation("Valaa_SplitView_View").nullable().isFalsy()}>
    <div className={VS`VSS(head.stylesheet, "view-missing")`}>
      No views
    </div>
  </If>
  <ForEach
      {...kuery(VALK.relations("Valaa_SplitView_View"))}
      rootProps={{ className: VS`VSS(head.stylesheet, "view")` }}
      locals={{ splitView: VS`head`, stylesheet: VS`head.stylesheet` }}>
    <div
        className={VS`VSS(stylesheet, "view-content")`}
        onClick={VS`splitView.focusViewGenerator(head)`}>
      <ValaaNode {...kuery(VALK.to("target"))} />
    </div>
  </ForEach>
</div>