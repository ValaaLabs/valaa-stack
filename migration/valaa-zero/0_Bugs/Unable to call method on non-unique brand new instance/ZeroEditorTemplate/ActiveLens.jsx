<div className={VS`VSS(head.stylesheet, "main-wrapper")`}>
  <div className={VS`VSS(head.stylesheet, "panel-wrapper")`}>
    <button className={VS`VSS(head.stylesheet, "panel-button")`} onClick={VS`head.openTestView`}>
      Open split view
    </button>
  </div>

  <div className={VS`VSS(head.stylesheet, "content-wrapper")`}>
    <ValaaNode kuery={VS`head.createSplitView()`} />
  </div>
</div>
