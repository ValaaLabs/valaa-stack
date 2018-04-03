() => {
    // Prompt for a property name, cancel property creation if the prompt is escaped
    let promptedPropertyName = window.prompt("Use what property name for the new script? (default 'newScript')");
    if (promptedPropertyName === null) return;
    if (promptedPropertyName === "") promptedPropertyName = "newScript";

    // Ensure uniqueness of the property
    let id = "";
    while(this.target[promptedPropertyName + id]) {
        if (id === "") id = 1;
        else id += 1;
    }
    const propertyName = promptedPropertyName + id;

    // Compose an extension prompting message
    let extensionPrompt = "Use what file extension for the script '" + propertyName + "'? (default 'vs')";
    if (propertyName !== promptedPropertyName) {
        extensionPrompt = "Property '" + promptedPropertyName + "' already exists, using a different name. " + extensionPrompt;
    }

    // Get the script file extension
    let extension = window.prompt(extensionPrompt);
    if (extension === null) return;
    if (extension === "") extension = "vs";

    // Create property
    const property = new Valaa.Property({
        name: propertyName,
        owner: this.target,
    });

    // Create media
    const fileName = propertyName + "." + extension;
    const media = new Valaa.Media({
        name: fileName,
        mediaType: { type: "text", subtype: "jsx" },
        owner: property,
    });

    // Point property to media
    this.target[propertyName] = media;
};
