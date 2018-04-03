(section) => {
  const log = this.createLogger("removeDocumentationSectionFactory");
  log(0, ["({\n\tsection:", section, "\n})"]);
  return () => {
    const log = this.createLogger("removeDocumentationSection");
    log(0, ["({\n\tsection:", section, "\n})"]);

    Resource.destroy(section);
  };
};