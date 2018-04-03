(goRelation) => {
  return () => {
    this.focus = goRelation;
    this.loadIssue(goRelation);
  };
};