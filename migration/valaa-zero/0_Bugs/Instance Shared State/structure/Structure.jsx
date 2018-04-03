<div className={VS`VSS(head.stylesheet, "column")`}>
  <button
      onClick={VS`head.addContainer`}
      className={VS`VSS(head.stylesheet, "button")`}>
    Add a container instance
  </button>
  <button
      onClick={VS`head.addItem`}
      className={VS`VSS(head.stylesheet, "button")`}>
    Add an object to the first container
  </button>
  <button
      onClick={VS`head.addItemBroken`}
      className={VS`VSS(head.stylesheet, "button")`}>
    Add an object to the first container using API idiom (broken version)
  </button>
  <ValaaNode kuery={VS`head.createSplitView()`} />
</div>