(structure, field) => {
  return () => {
    const element = window.document.getElementById(this.textElementId(structure));
    element.value = structure[field];
  };
};