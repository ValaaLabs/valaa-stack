import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import ProphetContentAPI from "~/valaa-prophet/ProphetContentAPI";

export default createContentAPI({
  name: "ValaaEngineContentAPI",
  inherits: [ProphetContentAPI],
  exposes: [],
});
