() => {
  // Prompt for a resource name, cancel resource creation if the prompt is escaped
  let resourceName = window.prompt("Use what name for the new Relation? (default 'newRelation')");
  if (resourceName === null) return;
  if (resourceName === "") resourceName = "newRelation";

  // Create resource
  const resource = new Valaa.Relation({
      name: resourceName,
      owner: this.target,
  });
};
