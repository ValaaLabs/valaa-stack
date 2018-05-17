import createContentAPI from "~/core/tools/graphql/createContentAPI";

import { CoreContentAPI } from "~/core";
import TestThing from "~/core/test/schema/TestThing";

export default createContentAPI({
  name: "ValaaCoreTestAPI",
  inherits: [CoreContentAPI],
  exposes: [TestThing],
});
