// @flow
import MediaTypeData from "~/tools/MediaTypeData";
import SimpleData from "~/tools/SimpleData";

export default class ImportBoard extends SimpleData {
  name: string;
  mediaType: MediaTypeData;
  nativeFile: ?File;
  getContent: ?Function;
  getFiles: ?Function;
  isDirectoryBoard: ?boolean;
}
