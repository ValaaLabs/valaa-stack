import createContentAPI from "~/core/tools/graphql/createContentAPI";

import ScriptContentAPI from "~/script/ScriptContentAPI";
import CoreTestAPI from "~/core/test/CoreTestAPI";
import TestScriptyThing from "~/script/test/schema/TestScriptyThing";

export default createContentAPI({
  name: "ValaaScriptTestAPI",
  inherits: [ScriptContentAPI, CoreTestAPI],
  exposes: [TestScriptyThing],
});
