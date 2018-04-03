<div className={VS`VSS(head.stylesheet, "root")`}>
  <div className={VS`VSS(head.stylesheet, "title")`}>
    Exclude the images that look the least like what you'd like to see
  </div>
  <div className={VS`VSS(head.stylesheet, "rows")`}>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.redrawPrograms`}>
      redraw programs
    </button>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.generateProgram`}>
      generate program
    </button>
  </div>
  <ForEach
      kuery={VS`head[Relatable.getRelations]("program")`}
      rootProps={{ className: VS`VSS(head.stylesheet, "rows")`}}
      locals={{ darwin: VS`head` }}>
    <div className={VS`VSS(darwin.stylesheet, "entry")`}>
      <div className={VS`VSS(darwin.stylesheet, "candidate")`}>
        <canvas
            id={VS`darwin.programCanvasId(head)`}
            className={VS`VSS(darwin.stylesheet, "canvas")`} />
      </div>
      <button
          className={VS`VSS(darwin.stylesheet, "exclude-button")`}
          onClick={VS`darwin.deleteProgramFactory(head)`}>
        x
      </button>
    </div>
  </ForEach>
</div>