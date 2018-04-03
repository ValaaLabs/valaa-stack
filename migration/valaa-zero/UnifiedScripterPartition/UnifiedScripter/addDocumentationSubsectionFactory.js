(section, target) => {
  const log = this.createLogger("addDocumentationSubsectionFactory");
  log(0, ["({",
    "\n\tsection:", section,
    "\n\ttarget: ", target,
    "\n})"]);
  return (event) => {
    const log = this.createLogger("addDocumentationSubsection");
    const element = event.nativeEvent.target;
    const value = event.nativeEvent.target.value;
    log(0, ["({",
      "\n\tsection:", section,
      "\n\ttarget: ", target,
      "\n\telement:", element,
      "\n\tvalue:  ", value,
      "\n})"]);

    if (!target[value]) {
      const confirmation = window.confirm(
        "The field '" + value + "' does not exist in the target. Create the documentation entry anyway?");
      if (!confirmation) return;
    }

    const entry = new Valaa.Entity({
      name: value,
      owner: section.entries,
    });
    log(1, ["entry is", entry]);

    element.value = "";
    log(1, ["Done"]);
  };
};