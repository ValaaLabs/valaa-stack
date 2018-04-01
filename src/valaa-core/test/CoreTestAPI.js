import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import { CoreContentAPI } from "~/valaa-core";
import TestThing from "~/valaa-core/test/schema/TestThing";

export default createContentAPI({
  name: "ValaaCoreTestAPI",
  inherits: [CoreContentAPI],
  exposes: [TestThing],
});
