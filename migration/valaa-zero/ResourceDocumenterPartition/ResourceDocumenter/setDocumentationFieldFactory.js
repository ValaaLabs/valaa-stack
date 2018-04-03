(data) => {
  const log = this.createLogger("setDocumentationFieldFactory");
  const structure = data.structure;
  const propertyName = data.propertyName;
  log(0, ["({\n\tstructure:", structure, "\n\tpropertyName:", propertyName, "\n})"]);

  return (event) => {
    const log = this.createLogger("setDocumentationField");
    log(0, [
      "({",
      "\n\tstructure:", structure,
      "\n\tpropertyName:", propertyName,
      "\n\tvalue:", event.nativeEvent.target.value,
      "\n})"
    ]);

    structure[propertyName] = event.nativeEvent.target.value;
    log(1, ["Done"]);
  };
};