// @flow
import { GraphQLObjectType } from "graphql/type";

import Describable from "~/raem/schema/Describable";
import Discoverable from "~/raem/schema/Discoverable";
import ResourceStub from "~/raem/schema/ResourceStub";
import Partition, { partitionInterface } from "~/raem/schema/Partition";
import Resource from "~/raem/schema/Resource";

import Scope from "~/script/schema/Scope";

import Relatable, { relatableInterface } from "~/script/schema/Relatable";

const OBJECT_DESCRIPTION = "scene";

export const SCENE_FROM_JSON = "SCENE_FROM_JSON";
export const SCENE_FROM_CSV = "SCENE_FROM_CSV";
export const SCENE_FROM_DIR_ATLAS = "SCENE_FROM_DIR_ATLAS";
export const SCENE_FROM_DIR_CSV = "SCENE_FROM_DIR_CSV";

export default new GraphQLObjectType({
  name: "Entity",

  description: "A conceptual area that contains objects and an environment",

  interfaces: () =>
      [Partition, Relatable, Scope, Describable, Discoverable, Resource, ResourceStub],

  fields: () => ({
    ...partitionInterface(OBJECT_DESCRIPTION).fields(),
    ...relatableInterface(OBJECT_DESCRIPTION).fields(),
  }),
});
