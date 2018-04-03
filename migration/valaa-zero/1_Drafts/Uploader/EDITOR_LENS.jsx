<div className={VS`VSS(focus.stylesheet, "root")`}>
  <label className={VS`VSS(focus.stylesheet, "upload-button")`}>
    Upload file using a file selection dialog
    <input
        id="file_uploader_button"
        onChange={VS`focus.buttonUpload`}
        type="file" />
  </label>
  <div
      id="file_uploader_area"
      className={VS`VSS(focus.stylesheet, "upload-area")`}
      onDragEnter={VS`focus.stopEventPropagation`}
      onDragOver={VS`focus.stopEventPropagation`}
      onDrop={VS`focus.areaUpload`}>
    Drag files here to upload data
  </div>
  <pre>Files:</pre>
  <ForEach
      kuery={VS`focus[Resource.unnamedOwnlings]`}
      rootProps={{ className: VS`VSS(focus.stylesheet, "root")` }}>
    <div>{VS`focus[Valaa.name]`}</div>
  </ForEach>
</div>