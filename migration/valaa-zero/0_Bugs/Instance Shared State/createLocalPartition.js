() => {
  console.log("InstanceSharedStateBug::createLocalPartition()");
  const localUserPartitionId =  this[Resource.createDerivedId]("localUserPartition");

  console.log("\tInstanceSharedStateBug::createLocalPartition - derived id for", this[Resource.rawId], ":", localUserPartitionId);
  const partitionURI = Valaa.Partition.createPartitionURI("valaa-local:", localUserPartitionId);

  const alreadyActive = Valaa.Partition.tryPartitionConnection(partitionURI);
  if (alreadyActive) {
      const localStructure = Valaa.Resource.getActiveResource(localUserPartitionId);
      console.log("\tInstanceSharedStateBug::createLocalPartition - Returning root resource of already connected local user data partition",
          localUserPartitionId, localStructure);
      return localStructure;
  }

  const initializationProcess = Valaa.Partition.acquirePartitionConnection(partitionURI);
  console.log("\tInstanceSharedStateBug::createLocalPartition - Acquiring connection to local user data partition", partitionURI, initializationProcess);
  return initializationProcess.then(connection => {
      let localStructure = Valaa.Resource.getActiveResource(localUserPartitionId);
      if (!localStructure) {
          ///////////////////////////////////////////////////////
          // Instance the bug structure in the local partition //
          ///////////////////////////////////////////////////////
          const StructureTemplate = this.structureTemplate;
          console.log("\tInstanceSharedStateBug::createLocalPartition - Grabbed the Structure Template:", StructureTemplate[Valaa.name], StructureTemplate);
          localStructure = new StructureTemplate({
              id: localUserPartitionId,
              owner: null,
              partitionAuthorityURI: "valaa-local:",
              name: StructureTemplate[Valaa.name] + " instance",
          });
          console.log("\tInstanceSharedStateBug::createLocalPartition - Instanced the Structure:", localStructure[Valaa.name], localStructure);
      } else {
          console.log("\tInstanceSharedStateBug::createLocalPartition - Found existing local user data Entity:", localStructure[Valaa.name], localStructure);
      }
      return localStructure;
  });
};