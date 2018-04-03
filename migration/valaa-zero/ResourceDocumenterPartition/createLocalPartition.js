() => {
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

    const localResourceDocumenter = Valaa.Resource.getActiveResource(localUserPartitionId);
    log(1, ["localResourceDocumenter is", localResourceDocumenter[Valaa.name], "/", localResourceDocumenter]);
    return localResourceDocumenter;
  }

  const initializationProcess = Valaa.Partition.acquirePartitionConnection(partitionURI);
  log(1, ["initializationProcess is", initializationProcess]);

  return initializationProcess.then(connection => {
    let localResourceDocumenter = Valaa.Resource.getActiveResource(localUserPartitionId);
    if (!localResourceDocumenter) {
      log(1, ["Creating a local resource documenter partition"]);

      const ResourceDocumenterTemplate = this.resourceDocumenterTemplate;
      log(1, ["resourceDocumenterTemplate is", ResourceDocumenterTemplate[Valaa.name], "/", ResourceDocumenterTemplate]);

      localResourceDocumenter = new resourceDocumenterTemplate({
        id: localUserPartitionId,
        owner: null,
        partitionAuthorityURI: "valaa-local:",
        name: resourceDocumenterTemplate[Valaa.name] + " instance",
      });
      log(1, ["Instanced the local resource documenter"]);
    } else {
      log(1, ["Found existing local user data Entity"]);
    }

    log(1, ["localResourceDocumenter is", localResourceDocumenter[Valaa.name], "/", localResourceDocumenter]);
    return localResourceDocumenter;
  });
};