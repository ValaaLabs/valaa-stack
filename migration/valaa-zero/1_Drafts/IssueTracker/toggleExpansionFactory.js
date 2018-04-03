(category) => {
  return () => {
    this.expanded[category] = !this.expanded[category];
  };
};