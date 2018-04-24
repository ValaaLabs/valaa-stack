// @flow

import exportValaaPlugin from "~/tools/exportValaaPlugin";

import ContentAPI from "./CoreContentAPI";

export default exportValaaPlugin({ name: "@valaa/core", ContentAPI });


export {
                                      ContentAPI,
                        ContentAPI as CoreContentAPI,
};
export {
                           default as Corpus,
} from "./Corpus";
export {
                           default as Command,
} from "./command/Command";
export {
                           default as ValaaReference,
                                      VRef,
                                      vRef,
} from "./ValaaReference";
export {
                           default as VALK
} from "./VALK/VALK";
export {
                           default as Valker,
                                      run,
} from "./VALK/Valker";
