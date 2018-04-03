(Template) => {
  const log = this.createLogger("createLocalPartition");
  log(0, ["()"]);

  const localUserPartitionId = this[Resource.createDerivedId]("localUserPartition");
  log(1, ["localUserPartitionId is", localUserPartitionId]);

  const partitionURI = Valaa.Partition.createPartitionURI("valaa-local:", localUserPartitionId);
  log(1, ["partitionURI is", partitionURI]);
  
  const alreadyActive = Valaa.Partition.tryPartitionConnection(partitionURI);
  log(1, ["alreadyActive is", alreadyActive]);

  if (alreadyActive) {
    log(1, ["Returning root resource of already connected local user data partition"]);

    const localUserData = Valaa.Resource.getActiveResource(localUserPartitionId);
    log(1, ["localUserData is", localUserData[Valaa.name], "/", localUserData]);
    return localUserData;
  }

  const initializationProcess = Valaa.Partition.acquirePartitionConnection(partitionURI);
  log(1, ["initializationProcess is", initializationProcess]);

  return initializationProcess.then(connection => {
    let localUserData = Valaa.Resource.getActiveResource(localUserPartitionId);
    if (!localUserData) {
      log(1, ["Template is", Template]);
      log(1, ["Creating a local instance of", Template[Valaa.name]]);

      localUserData = new Template({
        id: localUserPartitionId,
        owner: null,
        partitionAuthorityURI: "valaa-local:",
        name: Template[Valaa.name] + " instance",
      });
      log(1, ["Created a local instance of", Template[Valaa.name]]);
    } else {
      log(1, ["Found existing local user data Entity"]);
    }

    log(1, ["localUserData is", localUserData[Valaa.name], "/", localUserData]);
    return localUserData;
  });
};