import { module as es2015module, body as es2015body } from "~/script/acorn/es2015";
import * as es2016ToKueryRulesExtensions from "./parseRuleExtensions";

export const module = {
  name: "es2016",
  acornParseOptions: {
    ecmaVersion: 7,
    sourceType: "module"
  },
  parseRules: { ...es2015module.parseRules, ...es2016ToKueryRulesExtensions },
};

export const body = {
  name: "es2016",
  acornParseOptions: {
    ecmaVersion: 7,
    sourceType: "script"
  },
  parseRules: { ...es2015body.parseRules, ...es2016ToKueryRulesExtensions },
};
