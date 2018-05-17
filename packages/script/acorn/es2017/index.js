import { module as es2016module, body as es2016body } from "~/script/acorn/es2016";
import * as es2017ToKueryRulesExtensions from "./parseRuleExtensions";

export const module = {
  name: "es2017",
  acornParseOptions: {
    ecmaVersion: 8,
    sourceType: "module"
  },
  parseRules: { ...es2016module.parseRules, ...es2017ToKueryRulesExtensions },
};

export const body = {
  name: "es2017",
  acornParseOptions: {
    ecmaVersion: 8,
    sourceType: "script"
  },
  parseRules: { ...es2016body.parseRules, ...es2017ToKueryRulesExtensions },
};
