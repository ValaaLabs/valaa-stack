() => {
  // Prompt for a resource name, cancel resource creation if the prompt is escaped
  let resourceName = window.prompt("Use what name for the new Entity? (default 'newEntity')");
  if (resourceName === null) return;
  if (resourceName === "") resourceName = "newEntity";

  // Create resource
  const resource = new Valaa.Entity({
      name: resourceName,
      owner: this.target,
  });
};
