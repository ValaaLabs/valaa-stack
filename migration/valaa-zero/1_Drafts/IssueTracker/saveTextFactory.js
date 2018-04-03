(structure, field) => {
  return () => {
    const element = window.document.getElementById(this.textElementId(structure));
    structure[field] = element.value;
  };
};