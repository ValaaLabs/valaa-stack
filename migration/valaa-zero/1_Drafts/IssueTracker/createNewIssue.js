() => {
  const log = this.createLogger("createNewIssue");
  log(0, ["()"]);

  const newPartition = new Entity({
      name: "New Issue Partition",
      partitionAuthorityURI: Valaa.InspireClient.RemoteAuthorityURI,
      owner: null,
  });
  log(1, ["newPartition is", newPartition]);
   
  const indexEntity = Valaa.InspireClient.getPartitionIndexEntity();
  log(1, ["indexEntity is", indexEntity]);

  const goRelation = new Relation({
      name: "GO",
      owner: this.newBugsFolder,
      target: newPartition,
      properties: { name: "New issue" },
  });
  log(1, ["goRelation is", goRelation]);

  log(1, ["TODO: Set as focused issue and request issue loading"]);

  log(1, ["Done"]);
};
