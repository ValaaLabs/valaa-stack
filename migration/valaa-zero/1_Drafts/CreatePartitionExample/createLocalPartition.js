() => {
  console.log("CreateLocalPartition::createLocalPartition()");
  const localUserPartitionId =  this[Resource.createDerivedId]("localUserPartition");
  console.log("    CreateLocalPartition::createLocalPartition - derived id for", this[Resource.rawId], ":", localUserPartitionId);
  const partitionURI = Valaa.Partition.createPartitionURI("valaa-local:", localUserPartitionId);
  
  const alreadyActive = Valaa.Partition.tryPartitionConnection(partitionURI);
  if (alreadyActive) {
      const localUserData = Valaa.Resource.getActiveResource(localUserPartitionId);
      console.log("    CreateLocalPartition::createLocalPartition - Returning root resource of already connected local user data partition",
          localUserPartitionId, localUserData);
      return localUserData;
  }
  
  const initializationProcess = Valaa.Partition.acquirePartitionConnection(partitionURI);
  console.log("    CreateLocalPartition::createLocalPartition - Acquiring connection to local user data partition", partitionURI, initializationProcess);
  return initializationProcess.then(connection => {
      let localUserData = Valaa.Resource.getActiveResource(localUserPartitionId);
      if (!localUserData) {
          localUserData = new Valaa.Entity({
              id: localUserPartitionId,
              owner: null,
              partitionAuthorityURI: "valaa-local:",
              name: (this[Valaa.name] || "<unnamed project>") + " local user partition",
          });
          console.log("    CreateLocalPartition::createLocalPartition - Created new local user data Entity:", localUserData[Valaa.name], localUserData);
      } else {
          console.log("    CreateLocalPartition::createLocalPartition - Found existing local user data Entity:", localUserData[Valaa.name], localUserData);
      }
      return localUserData;
  });

};