// @flow

import type Kuery from "~/valaa-core/VALK/Kuery";

import SimpleData from "~/valaa-tools/SimpleData";

export default class Language extends SimpleData {
  name: string;
  acornParseOptions: Object;
  parseRules: Map<string, () => Kuery>;
}
