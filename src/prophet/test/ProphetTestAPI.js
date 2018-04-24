import createContentAPI from "~/core/tools/graphql/createContentAPI";

import ProphetContentAPI from "~/prophet/ProphetContentAPI";
import ScriptTestAPI from "~/script/test/ScriptTestAPI";

export default createContentAPI({
  name: "ValaaProphetTestAPI",
  inherits: [ProphetContentAPI, ScriptTestAPI],
  exposes: [],
});
