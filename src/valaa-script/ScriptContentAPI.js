import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import { CoreContentAPI } from "~/valaa-core";

import Expression from "~/valaa-script/schema/Expression";
import Identifier from "~/valaa-script/schema/Identifier";
import KueryExpression from "~/valaa-script/schema/KueryExpression";
import Literal from "~/valaa-script/schema/Literal";
import Property from "~/valaa-script/schema/Property";
import Relation from "~/valaa-script/schema/Relation";
import Relatable from "~/valaa-script/schema/Relatable";
import Scope from "~/valaa-script/schema/Scope";

export default createContentAPI({
  name: "ValaaScriptContentAPI",
  inherits: [CoreContentAPI],
  exposes: [
    Expression, Identifier, KueryExpression, Literal, Property, Relation, Relatable, Scope,
  ],
});
