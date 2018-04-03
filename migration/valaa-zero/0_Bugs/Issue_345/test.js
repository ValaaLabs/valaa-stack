() => {
  const instance = new this.proto({
    name: "instance of proto",
    owner: this,
  });
  instance.container.foo[Resource.owner] = instance.container.bar;
  console.info("Proto.container.foo.owner is", proto.container.foo[Resource.owner][Valaa.name]);
  console.info("Instance.container.foo.owner is", instance.container.foo[Resource.owner][Valaa.name]);
};