import createContentAPI from "~/raem/tools/graphql/createContentAPI";

import ScriptContentAPI from "~/script/ScriptContentAPI";
import Entity from "~/prophet/schema/Entity";
import Media from "~/prophet/schema/Media";

export default createContentAPI({
  name: "ValaaProphetContentAPI",
  inherits: [ScriptContentAPI],
  exposes: [Media, Entity],
});
