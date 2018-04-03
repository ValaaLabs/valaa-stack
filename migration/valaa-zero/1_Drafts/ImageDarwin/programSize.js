() => {
  // Palette
  const paletteSize = 16 * this.paletteColorSize();

  // Pixels
  const imageWidth  = 32;
  const imageHeight = 32;
  const nPixels = imageWidth * imageHeight;
  return this.paletteSize() + (nPixels * this.pixelSize());
};