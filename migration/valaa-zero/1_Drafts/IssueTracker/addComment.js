() => {
  const comment = new Relation({
    name: "IssueComment",
    owner: this.activeIssue,
    properties: {
      text: "Edit the comment text",
    },
  });
};