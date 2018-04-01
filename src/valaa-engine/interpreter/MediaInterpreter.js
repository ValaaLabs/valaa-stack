// @flow

// import type Vrapper from "~/valaa-engine/Vrapper";
import type { VALKOptions } from "~/valaa-core/VALK";

/**
 * Defines media interpreter interface
 */
export default class MediaInterpreter {
  static recognizedMediaType: ?Object = null;

  canInterpret (mediaType: { type: string, subtype: string }): boolean {
    const myMediaType = this.constructor.recognizedMediaType;
    if (!myMediaType) {
      throw new Error(`${this.constructor.name}.canInterpret is not implemented and ${
          this.constructor.name}.recognizedMediaType is not specified`);
    }
    return (mediaType.type === myMediaType.type) && (mediaType.subtype === myMediaType.subtype);
  }

  interpret (/* content: any, vOwner: Vrapper, mediaInfo: Object, options: VALKOptions = {} */):
      any {
    throw new Error(`${this.constructor.name}.interpret is not implemented`);
  }

  _getPartitionDebugName (vResource: any, options?: VALKOptions): string {
    const connection = vResource.getPartitionConnection();
    const vPartitionRoot = connection && vResource.engine.tryVrapper(connection.partitionRawId());
    return (vPartitionRoot && vPartitionRoot.get("name", options))
        || (connection && `${connection.partitionRawId().slice(0, 9)}...`)
        || "";
  }
}
