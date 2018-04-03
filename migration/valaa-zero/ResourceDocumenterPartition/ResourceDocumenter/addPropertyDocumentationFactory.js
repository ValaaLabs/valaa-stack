(data) => {
  const log = this.createLogger("addPropertyDocumentationFactory");
  const documentation = data.documentation;
  const propertyName = data.propertyName;
  log(0, ["(\n\tdocumentation:", documentation, "\n\tpropertyName:", propertyName, "\n)"]);

  return () => {
    const log = this.createLogger("addPropertyDocumentation");
    log(0, ["({\n\tdocumentation:", documentation, "\n\tpropertyName:", propertyName, "\n})"]);

    const fieldDocumentation = new Entity({
      name: propertyName + " field documentation",
      owner: documentation.properties,
    });
    log(1, ["fieldDocumentation is", fieldDocumentation]);

    fieldDocumentation.summary = "";
    fieldDocumentation.longDescription = "";
    fieldDocumentation.example = "";
    fieldDocumentation.exampleClarification = "";

    documentation.properties[propertyName] = fieldDocumentation;

    log(1, ["Done"]);
  };
};