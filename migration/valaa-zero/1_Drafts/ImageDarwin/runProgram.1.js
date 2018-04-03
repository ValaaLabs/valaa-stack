(program) => {
  const canvas = document.getElementById(this.programCanvasId(program));
  const context = canvas.getContext("2d");

  let stroke = "rgba(255, 255, 255, 1)";
  let fill   = "rgba(0,   0,   0,   1)";

  const runInstruction = (context, instruction) => {
    const operationSize = 3;
    const parameterSize = 8;
  
    const operation = parseInt(instruction.slice(0, operationSize), 2);
    const parameters = [];
    
    for (let bit = 2; bit < instruction.length; bit += parameterSize) {
      parameters.push(parseInt(instruction.slice(bit, bit + parameterSize), 2));
    }
  
    const OP_STROKE_COLOR  = parseInt("000", 2);
    const OP_STROKE_RECT   = parseInt("010", 2);
    const OP_STROKE_CIRCLE = parseInt("100", 2);
    const OP_FILL_COLOR    = parseInt("001", 2);
    const OP_FILL_RECT     = parseInt("011", 2);
    const OP_FILL_CIRCLE   = parseInt("101", 2);
    const OP_ROTATE        = parseInt("110", 2);
    
    if (operation === OP_STROKE_COLOR) {
      const r = parameters[0];
      const g = parameters[1];
      const b = parameters[2];
      const a = parameters[3] / 255.0;
      stroke = "rgba(" + [r, g, b, a].join(",") + ")";
      console.log("stroke(", stroke, ")");
      return;
    }

    if (operation === OP_FILL_COLOR) {
      const r = parameters[0];
      const g = parameters[1];
      const b = parameters[2];
      const a = parameters[3] / 255.0;
      fill = "rgba(" + [r, g, b, a].join(",") + ")";
      console.log("fill(", stroke, ")");
      return;
    }

    if (operation === OP_ROTATE) {
      const angle = (parameters[0] / 255.0) * 2 * Math.PI;
      context.rotate(angle);
      console.log("rotate", angle);
      return;
    }

    if (operation === OP_STROKE_RECT || operation === OP_FILL_RECT) {
      const x = parameters[0] - (0.5 * parameters[2]);
      const y = parameters[1] - (0.5 * parameters[3]);

      if (operation % 2 === 0) {
        context.strokeStyle = stroke;
        context.strokeRect(x, y, parameters[2], parameters[3]);
        console.log("strokeRect(", x, ",", y, ",", parameters[2], ",", parameters[3], ")");
      } else {
        context.fillStyle = fill;
        context.fillRect(x, y, parameters[2], parameters[3]);
        console.log("fillRect(", x, ",", y, ",", parameters[2], ",", parameters[3], ")");
      }
      return;
    }

    let path = false;
    if (operation === OP_STROKE_CIRCLE || operation === OP_FILL_CIRCLE) {
      path = true;
      context.beginPath();
      context.arc(parameters[0], parameters[1], parameters[2], 0, Math.PI * 2);
      console.log("arc(", parameters[0], ",", parameters[1], ",", parameters[2], ")");
    }

    if (path) {
      if (operation % 2 === 0) {
        context.strokeStyle = stroke;
        context.stroke();
        context.closePath();
      } else {
        context.fillStyle = fill;
        context.fill();
        context.closePath();
      }
    }
  };

  // Initialize the canvas
  context.clearRect(0, 0, 512, 512);
  context.save();
    
  const code = program.code;
  const instructionSize = this.instructionSize();
  for (let p = 0; p < code.length; p += instructionSize) {
    const instruction = code.slice(p, p + instructionSize);
    runInstruction(context, instruction);
  }
  context.restore();
};