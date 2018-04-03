() => {
  const programs = this[Relation.getRelations]("program");
  console.info("Redrawing", programs);
  for (let p = 0; p < programs.length; p++) {
    const program = programs[p];
    console.info("Redrawing program", program);
    this.runProgram(program);
  }
};