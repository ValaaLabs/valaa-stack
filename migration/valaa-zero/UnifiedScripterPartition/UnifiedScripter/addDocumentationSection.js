() => {
  const log = this.createLogger("addDocumentationRelation");
  log(0, ["()"]);

  // Prompt for a section name, cancel section creation if the prompt is escaped
  let sectionName = window.prompt("Use what name for the new Section? (default 'New Section')");
  if (sectionName === null) return;
  if (sectionName === "") sectionName = "New Section";
  log(1, ["sectionName is", sectionName]);

  // Find documentation
  const documentation = this.target[Relatable.getRelations]("Valaa_Documentation")[0];
  log(1, ["documentation is", documentation]);

  // Create relation
  const section = new Valaa.Relation({
      name: "Valaa_Documentation_Section",
      owner: documentation,
      properties: {
        name: sectionName,
      },
  });
  log(1, ["section is", section]);

  // Create entries section
  const entries = new Valaa.Entity({
    name: "Entries",
    owner: section,
  });
  log(1, ["entries is", entries]);
  section.entries = entries;

  log(1, ["Done"]);
};
