(data) => {
  const itemData = data.itemData;

  console.info("openItem({\n\titemData:", itemData, "\n})");

  const itemRelation = new Relation({
    name: "Item",
    target: itemData,
    owner: this,
  });
  console.info("\topenItem - itemRelation:", itemRelation);

  this.latestItem = itemData;
  console.info("\topenItem - latestItem =", this.itemRelation);
}