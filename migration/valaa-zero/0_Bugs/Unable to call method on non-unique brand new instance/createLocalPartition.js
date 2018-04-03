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

    const localZeroEditor = Valaa.Resource.getActiveResource(localUserPartitionId);
    log(1, ["localZeroEditor is", localZeroEditor[Valaa.name], "/", localZeroEditor]);
    return localZeroEditor;
  }

  const initializationProcess = Valaa.Partition.acquirePartitionConnection(partitionURI);
  log(1, ["initializationProcess is", initializationProcess]);

  return initializationProcess.then(connection => {
    let localZeroEditor = Valaa.Resource.getActiveResource(localUserPartitionId);
    if (!localZeroEditor) {
      log(1, ["Creating a local zero editor partition"]);

      const ZeroEditorTemplate = this.zeroEditorTemplate;
      log(1, ["ZeroEditorTemplate is", ZeroEditorTemplate[Valaa.name], "/", ZeroEditorTemplate]);

      localZeroEditor = new ZeroEditorTemplate({
        id: localUserPartitionId,
        owner: null,
        partitionAuthorityURI: "valaa-local:",
        name: ZeroEditorTemplate[Valaa.name] + " instance",
      });
      log(1, ["Instanced the local zero editor"]);
    } else {
      log(1, ["Found existing local user data Entity"]);
    }

    log(1, ["localZeroEditor is", localZeroEditor[Valaa.name], "/", localZeroEditor]);
    return localZeroEditor;
  });
};