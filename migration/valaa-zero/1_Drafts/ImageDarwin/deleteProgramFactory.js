(relation) => {
  return () => {
    Relation.destroy(relation);
    this.repopulateIfNeeded();
  };
};