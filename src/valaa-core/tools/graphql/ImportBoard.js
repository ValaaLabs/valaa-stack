// @flow
import MediaTypeData from "~/valaa-tools/MediaTypeData";
import SimpleData from "~/valaa-tools/SimpleData";

export default class ImportBoard extends SimpleData {
  name: string;
  mediaType: MediaTypeData;
  nativeFile: ?File;
  getContent: ?Function;
  getFiles: ?Function;
  isDirectoryBoard: ?boolean;
}
