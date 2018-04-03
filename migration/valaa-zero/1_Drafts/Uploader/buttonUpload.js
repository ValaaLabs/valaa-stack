() => {
  const file = document.getElementById("file_uploader_button").files[0];
  console.info("File is", file);
  if (file) {
    this.readFile(file);
  }
}