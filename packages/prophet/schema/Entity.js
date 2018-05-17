// @flow
import { GraphQLObjectType } from "graphql/type";

import Describable from "~/core/schema/Describable";
import Discoverable from "~/core/schema/Discoverable";
import ResourceStub from "~/core/schema/ResourceStub";
import Partition, { partitionInterface } from "~/core/schema/Partition";
import Resource from "~/core/schema/Resource";

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
