import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import ScriptContentAPI from "~/valaa-script/ScriptContentAPI";
import Entity from "~/valaa-prophet/schema/Entity";
import Media from "~/valaa-prophet/schema/Media";

export default createContentAPI({
  name: "ValaaProphetContentAPI",
  inherits: [ScriptContentAPI],
  exposes: [Media, Entity],
});
