() => {
  const log = this.createLogger("addDocumentation");
  log(0, ["()"]);

  const documentation = new Relation({
    name: "Valaa_Documentation",
    owner: this.target,
    target: this.target,
  });
  log(1, ["documentation relation is", documentation]);

  const main = new Entity({
    name: "Main Documentation Section",
    owner: documentation,
  });
  log(1, ["main section is", main]);
  documentation.main = main;

  documentation.main.summary = "";
  documentation.main.longDescription = "";

  const properties = new Entity({
    name: "Property Fields",
    owner: documentation,
  });
  log(1, ["fields section is", properties]);
  documentation.properties = properties;

  log(1, ["Done"]);
}