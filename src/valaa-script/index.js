// @flow

import exportValaaPlugin from "~/valaa-tools/exportValaaPlugin";

import ContentAPI from "./ScriptContentAPI";
import * as mediaDecoders from "./mediaDecoders";

export default exportValaaPlugin({ name: "valaa-script", ContentAPI, mediaDecoders });


export {
                                      ContentAPI,
                        ContentAPI as ScriptContentAPI
};
export {
                           default as transpileValaaScript,
                                      transpileValaaScriptBody,
                                      transpileValaaScriptModule,
} from "./transpileValaaScript";
export {
                           default as addExportsContainerToScope
} from "./denormalized/addExportsContainerToScope";
export {
                                      NativeIdentifierTag,
                                      createNativeIdentifier,
                                      isNativeIdentifier,
                                      getNativeIdentifierValue,
                                      setNativeIdentifierValue,
} from "./denormalized/nativeIdentifier";
export {
                                      BuiltinTypePrototype,
                                      ValaaPrimitive,
} from "./VALSK/builtinSteppers";
