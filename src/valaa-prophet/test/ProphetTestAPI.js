import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import ProphetContentAPI from "~/valaa-prophet/ProphetContentAPI";
import ScriptTestAPI from "~/valaa-script/test/ScriptTestAPI";

export default createContentAPI({
  name: "ValaaProphetTestAPI",
  inherits: [ProphetContentAPI, ScriptTestAPI],
  exposes: [],
});
