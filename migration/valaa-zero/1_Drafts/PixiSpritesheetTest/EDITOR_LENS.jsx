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
    TextureAtlas adapted from https://opengameart.org/content/school-girl
  </div>
</div>