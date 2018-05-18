import createContentAPI from "~/raem/tools/graphql/createContentAPI";

import Resource from "~/raem/schema/Resource";
import InactiveResource from "~/raem/schema/InactiveResource";

import mutations from "~/raem/schema/mutation";
import { validators } from "~/raem/command";
import createValaaRAEMReducers from "~/raem/redux/createValaaRAEMReducers";

export default createContentAPI({
  name: "ValaaRAEMContentAPI",
  exposes: [Resource, InactiveResource], // TODO(iridian): Add the rest.
  mutations,
  validators,
  reducers: [createValaaRAEMReducers],
});
