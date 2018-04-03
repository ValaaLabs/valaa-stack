(data) => {
  const container = data.container;
  console.info("openContainer({\n\tcontainer:", container, "\n})");

  const containerRelation = new Relation({
    name: "Container",
    target: container,
    owner: this,
  });
  console.info("\topenContainer - container relation is", containerRelation);
}