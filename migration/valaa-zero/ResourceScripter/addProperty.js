() => {
  // Prompt for a property name, cancel property creation if the prompt is escaped
  let promptedPropertyName = window.prompt("Use what name for the new Property? (default 'newProperty')");
  if (promptedPropertyName === null) return;
  if (promptedPropertyName === "") promptedPropertyName = "newProperty";

  // Ensure uniqueness of the property
  let id = "";
  while(this.target[promptedPropertyName + id]) {
      if (id === "") id = 1;
      else id += 1;
  }
  const propertyName = promptedPropertyName + id;

  // Alert user of property name collision
  if (propertyName !== promptedPropertyName) {
    window.alert("The property name '" + promptedPropertyName + "' was already taken, using '" + propertyName + "' instead.");
  }

  // Create property
  const property = new Valaa.Property({
      name: propertyName,
      owner: this.target,
  });
};
