import * as parseRules from "./parseRules";

export default {
  name: "es5",
  acornParseOptions: { ecmaVersion: 5 },
  parseRules,
};
