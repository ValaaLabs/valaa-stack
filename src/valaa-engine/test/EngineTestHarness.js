// @flow

import ProphetTestHarness, { createProphetTestHarness, createProphetOracleHarness }
    from "~/valaa-prophet/test/ProphetTestHarness";

import EngineTestAPI from "~/valaa-engine/test/EngineTestAPI";
import ValaaEngine from "~/valaa-engine/ValaaEngine";
import type Vrapper from "~/valaa-engine/Vrapper";
import Cog from "~/valaa-engine/Cog";
import { builtinSteppers } from "~/valaa-engine/VALEK";
import injectScriptAPIToScope from "~/valaa-engine/ValaaSpaceAPI";

import baseEventBlock from "~/valaa-engine/test/baseEventBlock";

export function createEngineTestHarness (options: Object, ...commandBlocks: any) {
  return createProphetTestHarness({
    name: "Engine Test Harness", ContentAPI: EngineTestAPI, TestHarness: EngineTestHarness,
    corpusOptions: { builtinSteppers },
    ...options,
  }, ...(options.claimBaseBlock ? [baseEventBlock] : []), ...commandBlocks);
}

export async function createEngineOracleHarness (options: Object, ...commandBlocks: any) {
  return createProphetOracleHarness({
    name: "Engine Oracle Harness", ContentAPI: EngineTestAPI, TestHarness: EngineTestHarness,
    corpusOptions: { builtinSteppers },
    ...options,
  }, ...(options.claimBaseBlock ? [baseEventBlock] : []), ...commandBlocks);
}

export default class EngineTestHarness extends ProphetTestHarness {
  constructor (options: Object) {
    super(options);
    this.engine = new ValaaEngine({
      name: "Test ValaaEngine",
      logger: this.getLogger(),
      prophet: this.prophet,
      debugLevel: this.getDebugLevel(),
    });

    const Valaa = injectScriptAPIToScope(this.engine.getRootScope(),
        this.engine.getHostObjectDescriptors(), this.schema);
    Valaa.InspireClient = {
      RemoteAuthorityURI: "valaa-testing:",
      LocalAuthorityURI: "valaa-local:",
    };

    this.createds = new TestCollectCREATEDCog();
    this.engine.addCog(this.createds);
    this.entities = this.createds.Entity;
  }
}

export class TestCollectCREATEDCog extends Cog {
  constructor () {
    super({ name: "Test Collect CREATED's Cog" });
    this.TestScriptyThing = {};
  }

  onEventCREATED (vResource: Vrapper) {
    (this[vResource.getTypeName()] || (this[vResource.getTypeName()] = {}))[vResource.getRawId()]
        = vResource;
  }
}
