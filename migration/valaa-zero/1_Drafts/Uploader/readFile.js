(file) => {
  const mediaType = file.type.split("/");

  const reader = new FileReader();
  reader.onload = (event) => {
    this[Media.prepareBlob](event.target.result).then(createBlobId => {
      new Media({
        owner: this,
        name: file.name,
        mediaType: { type: mediaType[0], subtype: mediaType[1] || "" },
        content: createBlobId(),
      });
    });
  };

  if (file.type.indexOf("text") === 0) {
    reader.readAsText(file, "UTF-8");
  } else {
    reader.readAsArrayBuffer(file);
  }
};