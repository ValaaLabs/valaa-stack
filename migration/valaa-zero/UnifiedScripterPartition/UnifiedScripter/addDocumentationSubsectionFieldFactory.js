(subsection, fieldName) => {
  const log = this.createLogger("addDocumentationSubsectionFieldFactory");
  log(0, ["({",
    "\n\tsubsection:", subsection,
    "\n\tfieldName: ", fieldName,
    "\n})"]);

  return () => {
    const log = this.createLogger("addDocumentationSubsectionField");
    log(0, ["({",
      "\n\tsubsection:", subsection,
      "\n\tfieldName: ", fieldName,
      "\n})"]);
    subsection[fieldName] = "Add content here";
  };
};