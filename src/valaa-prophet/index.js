// @flow

/* eslint-disable */

import exportValaaPlugin from "~/valaa-tools/exportValaaPlugin";

import ContentAPI from "./ProphetContentAPI";
import * as schemes from "./schemes";

export default exportValaaPlugin({ name: "valaa-prophet", ContentAPI, schemes });


export { default as Discourse } from "./api/Discourse";
export { default as Follower } from "./api/Follower";
export { default as PartitionConnection } from "./api/PartitionConnection";
export { default as Prophecy } from "./api/Prophecy";
export { default as Prophet } from "./api/Prophet";
export type Transaction = Object;

export { default as AuthorityNexus } from "./prophet/AuthorityNexus";
export { default as DecoderArray } from "./prophet/DecoderArray";
export { default as FalseProphet } from "./prophet/FalseProphet";
export { default as FalseProphetDiscourse } from "./prophet/FalseProphetDiscourse";
export { default as Oracle } from "./prophet/Oracle";
export { default as Scribe } from "./prophet/Scribe";
export { default as ScribePartitionConnection } from "./prophet/ScribePartitionConnection";
