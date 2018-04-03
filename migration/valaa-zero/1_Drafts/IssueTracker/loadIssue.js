(goRelation) => {
  const log = this.createLogger("loadPartition");
  log(0, ["({",
      "\n\tgoRelation:", goRelation,
      "\n})"]);

  // Make sure we don't have an "inactive activeIssue"
  this.activeIssue = null;

  // Bail early if the function was called without an issue relation
  if (!goRelation) {
    return;
  }
      
  const maybeActivePartition = goRelation[Relation.target];
  log(1, ["maybeActivePartition is", maybeActivePartition]);

  const activation = Resource.activate(maybeActivePartition);
  log(1, ["activating the remote partition", activation]);
  activation.then(result => {
    log(1, ["activation complete. maybeActivePartition is", maybeActivePartition]);
    this.activeIssue = maybeActivePartition;
  });
};
