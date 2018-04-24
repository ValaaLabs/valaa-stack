// @flow

import { denoteValaaBuiltinWithSignature } from "~/valaa-core/VALK";

import globalHTML5BuiltinObjects from "./globalHTML5BuiltinObjects";
import extendValaa from "./Valaa";

export default function extendValaaSpace (scope: Object, hostObjectDescriptors: any,
    defaultAuthorityConfig?: Object, engine?: Object) {
  Object.assign(scope, globalHTML5BuiltinObjects);
  extendValaa(scope, hostObjectDescriptors);

  let RemoteAuthorityURI = null;
  let getPartitionIndexEntityCall = function getPartitionIndexEntity () {
    throw new Error(`Cannot locate partition index entity; Inspire view configuration${
        ""} doesn't specify defaultAuthorityURI`);
  };

  if (defaultAuthorityConfig) {
    // FIXME(iridian): Implement this.schemes - still missing.
    RemoteAuthorityURI = defaultAuthorityConfig.partitionAuthorityURI;
    getPartitionIndexEntityCall = function getPartitionIndexEntity () {
      return engine.tryVrapper(defaultAuthorityConfig.repositoryIndexId);
    };
  }

  scope.Valaa.InspireGateway = {
    RemoteAuthorityURI,
    LocalAuthorityURI: "valaa-local:",
    getPartitionIndexEntity: denoteValaaBuiltinWithSignature(
      `Returns the partition corresponding to the partition index.`
    )(getPartitionIndexEntityCall),
  };
}
