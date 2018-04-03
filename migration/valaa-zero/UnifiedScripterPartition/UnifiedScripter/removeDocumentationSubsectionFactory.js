(subsection) => {
  const log = this.createLogger("removeDocumentationSubsectionFactory");
  log(0, ["({\n\tsubsection:", subsection, "\n})"]);
  return () => {
    const log = this.createLogger("removeDocumentationSubsection");
    log(0, ["({\n\tsubsection:", subsection, "\n})"]);

    Resource.destroy(subsection);
  };
};