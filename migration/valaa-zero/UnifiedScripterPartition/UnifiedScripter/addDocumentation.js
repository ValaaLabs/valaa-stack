() => {
  const log = this.createLogger("addDocumentation");
  log(0, ["()"]);

  const DocumentationTemplate = this.documentationTemplate;
  log(1, ["DocumentationTemplate is", DocumentationTemplate]);

  const documentation = new DocumentationTemplate({
    name: "Valaa_Documentation",
    owner: this.target,
    target: this.target,
  });
  log(1, ["documentation relation is", documentation]);

  log(1, ["Done"]);
};