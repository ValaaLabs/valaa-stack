() => {
  const programs = this[Relatable.getRelations]("program");
  if (programs.length > 5) {
    console.info("Not yet needed to repopulate the programs");
    return;
  }

  // Fill the rest of the next candidates assorted mixes of the survivors
  // and (possibly) a few randomly generated elements
  for (let count = 0; count < 13; count++) {
    if (Math.random < 0.15) {
      // Once in a while we come out with a random element
    this.generateProgram();
    } else {
      // But mostly we mix two of the survivors at random
      const firstIndex = Math.floor(Math.random() * 5);
      const secondIndex = (firstIndex + 1 + Math.floor(Math.random() * 4)) % 5;
      const A = programs[firstIndex];
      const B = programs[secondIndex];
      this.mergePrograms(A, B);
    }
  }
};