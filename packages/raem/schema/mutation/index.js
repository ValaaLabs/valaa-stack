import mutationField from "~/raem/tools/graphql/mutationField";

import c from "./create";
import d from "./destroy";
import m from "./modify";
import dup from "./duplicate";
import t from "./transact";

export const create = c;
export const destroy = d;
export const modify = m;
export const duplicate = dup;
export const transact = t;
export default
    Object.entries({ create, destroy, modify, duplicate, transact })
    .reduce(
        (exports, [name, mutation]) => Object.assign(exports,
            mutationField(name, mutation.type, mutation.description, mutation)),
        {});
