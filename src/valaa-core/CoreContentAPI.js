import createContentAPI from "~/valaa-core/tools/graphql/createContentAPI";

import Resource from "~/valaa-core/schema/Resource";
import InactiveResource from "~/valaa-core/schema/InactiveResource";

import mutations from "~/valaa-core/schema/mutation";
import { validators } from "~/valaa-core/command";
import createValaaCoreReducers from "~/valaa-core/redux/createValaaCoreReducers";

export default createContentAPI({
  name: "ValaaCoreContentAPI",
  exposes: [Resource, InactiveResource], // TODO(iridian): Add the rest.
  mutations,
  validators,
  reducers: [createValaaCoreReducers],
});
