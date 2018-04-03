(A, B) => {
  if (!A) {
    console.error("mergePrograms::A is undefined");
    return;
  }
  if (!B) {
    console.error("mergePrograms::B is undefined");
    return;
  }

  let code = "";
  const codeA = A.code;
  const codeB = B.code;
  for (let bit = 0; bit < codeA.length; bit++) {
    // Allow a small chance of random mutation
    if (Math.random() < 0.004) {
      code += Number(Math.random() < 0.5);
    } else {
      if (Math.random() < 0.5) {
        code += codeA[bit];
      } else {
        code += codeB[bit];
      }
    }
  }

  console.info("Code is", code);
  new Relation({
    name: "program",
    owner: this,
    properties: {
      code: code,
    }
  });
};