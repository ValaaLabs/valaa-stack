<div className={VS`VSS(focus.stylesheet, "pixi-test")`}>
  <div className="toolbox">
    <input
        id="file_uploader_button"
        className="uploader"
        type="file"
        onChange={VS`focus.upload`} />
    <button
        className="run-button"
        onClick={VS`focus.run`}>
      Run test
    </button>
  </div>
  <div
      id="canvas_goes_here"
      className="canvas-holder">
  </div>
  <div className="footer">
    Tileset by gfx0 taken from https://opengameart.org/content/rpg-tileset-32x32
  </div>
</div>