() => {
  console.log("AddItem()");
  const relations = this.splitView[Relatable.getRelations]("Container");
  console.log("\tRelations:      ", relations);
  if (relations.length === 0) {
    window.alert("Create a container first");
    return;
  }

  const firstRelation = relations[0];
  console.log("\tfirstRelation:  ", firstRelation);

  const container = firstRelation[Relation.target];
  console.log("\tfirst container:", container);

  const ItemTemplate = this.itemTemplate;
  console.log("\titemTemplate:   ", ItemTemplate);
  
  const itemData = new ItemTemplate({
    name: "New item",
    owner: container,
  });
  console.log("\titem data:      ", itemData);

  const itemRelation = new Relation({
    name: "Item",
    target: itemData,
    owner: container,
  });
  console.info("\taddItem - itemRelation:", itemRelation);

  container.latestItem = itemData;
  console.info("\addItem - latestItem =", container.itemRelation);

}