// @flow

// TODO(iridian): valaa-inspire entry is possibly not the appropriate place for babel-polyfill:
// at the moment it still is the top level entry point, but this might change.
import "babel-polyfill";
import injectTapEventPlugin from "react-tap-event-plugin";

import InspireClient from "~/valaa-inspire/InspireClient";
import { Revelation, combineRevelationsLazily } from "~/valaa-inspire/Revelation";

import revelationTemplate from "~/valaa-inspire/revelation.template";

import * as prophetDecoders from "~/valaa-prophet/decoders";

import { schemePlugin as valaaLocalSchemePlugin } from "~/scheme-valaa-local";
import { schemePlugin as valaaTransientSchemePlugin } from "~/scheme-valaa-transient";

import { getGlobal, Logger, LogEventGenerator, outputError } from "~/valaa-tools";

const logger = new Logger();

const schemePlugins = [
  valaaLocalSchemePlugin,
  valaaTransientSchemePlugin,
];

injectTapEventPlugin();

const createInspireClientGlobalName = "createInspireClient";

export default createInspireClient;

export async function createInspireClient (...revelations: Revelation[]) {
  let ret;
  const revelationComponents = revelations.concat({ schemePlugins });
  let combinedRevelation;
  try {
    logger.warn(`Initializing Inspire Application Gateway in environment (${
        String(process.env.NODE_ENV)}) by combining the revelation components`,
        revelationComponents);
    combinedRevelation = await combineRevelationsLazily(
        revelationTemplate,
        ...revelationComponents);
    logger.warn(`  revelation combined as`, combinedRevelation);

    ret = new InspireClient({ name: combinedRevelation.name, logger });

    await ret.initialize(combinedRevelation);

    getGlobal().inspireClient = ret;
    ret.warnEvent(`InspireClient set to window.inspireClient as`, ret);
    return ret;
  } catch (error) {
    outputError((ret || new LogEventGenerator(logger)).wrapErrorEvent(error,
        `createInspireClient(), with`,
            "\n\trevelation components:", revelations,
            "\n\tcombined revelation:", combinedRevelation));
    throw new Error("Failed to initialize Inspire Client. See message log for more details.");
  }
}

if (window) {
  window[createInspireClientGlobalName] = createInspireClient;
}
