// @flow

import type Kuery from "~/core/VALK/Kuery";

import SimpleData from "~/tools/SimpleData";

export default class Language extends SimpleData {
  name: string;
  acornParseOptions: Object;
  parseRules: Map<string, () => Kuery>;
}
