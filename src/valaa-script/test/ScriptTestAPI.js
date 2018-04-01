import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import ScriptContentAPI from "~/valaa-script/ScriptContentAPI";
import CoreTestAPI from "~/valaa-core/test/CoreTestAPI";
import TestScriptyThing from "~/valaa-script/test/schema/TestScriptyThing";

export default createContentAPI({
  name: "ValaaScriptTestAPI",
  inherits: [ScriptContentAPI, CoreTestAPI],
  exposes: [TestScriptyThing],
});
