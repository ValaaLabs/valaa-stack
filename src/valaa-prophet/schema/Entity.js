// @flow
import { GraphQLObjectType } from "graphql/type";
import { jsonRecognizer, csvRecognizer, nameRecognizer } from "~/valaa-core/tools/graphql/recognizers";

import Describable from "~/valaa-core/schema/Describable";
import Discoverable from "~/valaa-core/schema/Discoverable";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Partition, { partitionInterface } from "~/valaa-core/schema/Partition";
import Resource from "~/valaa-core/schema/Resource";

import Scope from "~/valaa-script/schema/Scope";

import Relatable, { relatableInterface } from "~/valaa-prophet/schema/Relatable";

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

  recognizers: () => ({
    application: { json: jsonRecognizer({ sceneVersion: true }, SCENE_FROM_JSON) },
    text: {
      csv: csvRecognizer("sceneName",
          SCENE_FROM_CSV),
      plain: jsonRecognizer({ sceneVersion: true },
          SCENE_FROM_JSON),
      directory: [
        nameRecognizer({ "(.*)Atlas.json": jsonRecognizer({ frames: true, meta: true }, true) },
            SCENE_FROM_DIR_ATLAS),
        nameRecognizer({ "scene.csv": csvRecognizer("sceneName") },
            SCENE_FROM_DIR_CSV),
      ],
    },
  }),

  fields: () => ({
    ...partitionInterface(OBJECT_DESCRIPTION).fields(),
    ...relatableInterface(OBJECT_DESCRIPTION).fields(),
  }),
});
