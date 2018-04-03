(event) => {
  event.stopPropagation();
  event.preventDefault();

  const files = event.nativeEvent.dataTransfer.files;
  for (let f = 0; f < files.length; f++) {
    const file = files[f];
    this.readFile(file);
  }
};