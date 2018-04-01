import es5Language from "~/valaa-script/acorn/es5";
import * as es2015ToKueryRulesExtensions from "./parseRuleExtensions";

export const module = {
  name: "es2015",
  acornParseOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  },
  parseRules: { ...es5Language.parseRules, ...es2015ToKueryRulesExtensions },
};

export const body = {
  name: "es2015",
  acornParseOptions: {
    ecmaVersion: 6,
    sourceType: "script"
  },
  parseRules: { ...es5Language.parseRules, ...es2015ToKueryRulesExtensions },
};
