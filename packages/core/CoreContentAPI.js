import createContentAPI from "~/core/tools/graphql/createContentAPI";

import Resource from "~/core/schema/Resource";
import InactiveResource from "~/core/schema/InactiveResource";

import mutations from "~/core/schema/mutation";
import { validators } from "~/core/command";
import createValaaCoreReducers from "~/core/redux/createValaaCoreReducers";

export default createContentAPI({
  name: "ValaaCoreContentAPI",
  exposes: [Resource, InactiveResource], // TODO(iridian): Add the rest.
  mutations,
  validators,
  reducers: [createValaaCoreReducers],
});
