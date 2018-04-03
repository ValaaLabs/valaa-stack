() => {
  console.log("AddContainer()");

  const ContainerTemplate = this.containerTemplate;
  console.log("\tContainerTemplate:", ContainerTemplate[Valaa.rawId], "-", ContainerTemplate);

  const newContainer = new ContainerTemplate({
    name: "New Container",
    owner: this.splitView,
  });
  console.log("\tnew Container:    ", newContainer[Valaa.rawId], "-", newContainer);

  this.splitView.openContainer({ container: newContainer });
}