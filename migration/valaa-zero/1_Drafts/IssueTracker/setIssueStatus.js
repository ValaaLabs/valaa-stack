(event) => {
  const log = this.createLogger("setIssueStatus");
  log(0, ["({\n\tevent:", event, "\n})"]);

  const folderName = event.nativeEvent.target.value;
  log(1, ["folderName is", folderName]);

  const bugFolders = this.bugs[Resource.unnamedOwnlings];
  log(1, ["bugFolders is", bugFolders]);

  for (let i = 0; i < bugFolders.length; i++) {
    const bugFolder = bugFolders[i];
    log(1, ["Checking bug folder", bugFolder[Valaa.name]]);

    if (bugFolder[Valaa.name] === folderName) {
      log(1, ["Found the correct bug folder, moving issue"]);
      // NOTE: Workaround to being unable to set relation source below
      const newFocus = new Relation({
        name: "GO",
        owner: bugFolder,
        target: this.focus[Relation.target],
        properties: {
          name: this.focus.name,
        }
      });
      Relation.destroy(this.focus);
      this.focus = newFocus;
      break;
    }
  }
  log(1, ["Done"]);
};