(data) => {
  const log = this.createLogger("removePropertyDocumentationFactory");
  const documentation = data.documentation;
  const propertyName = data.propertyName;
  log(0, ["(\n\tdocumentation:", documentation, "\n\tpropertyName:", propertyName, "\n)"]);

  return () => {
    const log = this.createLogger("removePropertyDocumentation");
    log(0, ["({\n\tdocumentation:", documentation, "\n\tpropertyName:", propertyName, "\n})"]);
    
    const fieldDocumentation = documentation.properties[propertyName];
    log(1, ["fieldDocumentation is", fieldDocumentation]);

    documentation.properties[propertyName] = null;
    Resource.destroy(fieldDocumentation);

    log(1, ["Done"]);
  };
};