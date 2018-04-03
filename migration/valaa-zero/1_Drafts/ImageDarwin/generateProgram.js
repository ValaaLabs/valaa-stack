() => {
  const bits = this.programSize();
  let code = "";
  for (let bit = 0; bit < bits; bit++) {
    code += Number(Math.random() < 0.5);
  }
  console.info("Code is", code);
  new Relation({
    name: "program",
    owner: this,
    properties: {
      code: code,
    },
  });
};