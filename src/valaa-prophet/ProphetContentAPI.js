import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import ScriptContentAPI from "~/valaa-script/ScriptContentAPI";
import Entity from "~/valaa-prophet/schema/Entity";
import Media from "~/valaa-prophet/schema/Media";
import Relation from "~/valaa-prophet/schema/Relation";
import Relatable from "~/valaa-prophet/schema/Relatable";

export default createContentAPI({
  name: "ValaaProphetContentAPI",
  inherits: [ScriptContentAPI],
  exposes: [Media, Entity, Relation, Relatable],
});
