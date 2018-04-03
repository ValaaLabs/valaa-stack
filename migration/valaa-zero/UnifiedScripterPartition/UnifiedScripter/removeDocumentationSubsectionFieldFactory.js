(subsection, fieldName) => {
  const log = this.createLogger("removeDocumentationSubsectionFieldFactory");
  log(0, ["({",
    "\n\tsubsection:", subsection,
    "\n\tfieldName: ", fieldName,
    "\n})"]);

  return () => {
    const log = this.createLogger("removeDocumentationSubsectionField");
    log(0, ["({",
      "\n\tsubsection:", subsection,
      "\n\tfieldName: ", fieldName,
      "\n})"]);
    subsection[fieldName] = undefined;
  };
};