import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import EngineContentAPI from "~/valaa-engine/EngineContentAPI";
import ProphetTestAPI from "~/valaa-prophet/test/ProphetTestAPI";

import TestScriptyThing from "~/valaa-script/test/schema/TestScriptyThing";

export default createContentAPI({
  name: "ValaaEngineTestAPI",
  inherits: [EngineContentAPI, ProphetTestAPI],
  exposes: [TestScriptyThing],
});
