(program) => {
  const canvas = document.getElementById(this.programCanvasId(program));
  const context = canvas.getContext("2d");

  let stroke = "rgba(255, 255, 255, 1)";
  let fill   = "rgba(0,   0,   0,   1)";

  // Initialize the canvas
  context.clearRect(0, 0, 512, 512);
    
  const code = program.code;
  const palette = [];
  const paletteColorSize = this.paletteColorSize();
  for (let c = 0; c < 16; c++) {
    const p = c * paletteColorSize;
    palette.push({
      r: parseInt(code.slice(p,    p+8),  2),
      g: parseInt(code.slice(p+8,  p+16), 2),
      b: parseInt(code.slice(p+16, p+24), 2),
    });
  }
  console.log("Palette:", palette);
  const pixels = program.code.slice(this.paletteSize());
  const instructionSize = this.pixelSize();
  for (let y=0; y < 32; y++) {
    for (let x=0; x < 32; x++) {
      const p = instructionSize * (x + (y * 32));
      const colorIndexB = code.slice(p, p + instructionSize);
      const colorIndex = parseInt(colorIndexB, 2);
      const color = palette[colorIndex];
      context.fillStyle = "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 1)";
      context.fillRect(x * 8, y * 8, 8, 8);
    }
  }
};