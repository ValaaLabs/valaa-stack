// @flow

// TODO(iridian): valaa-inspire entry is possibly not the appropriate place for babel-polyfill:
// at the moment it still is the top level entry point, but this might change.
import "babel-polyfill";
import injectTapEventPlugin from "react-tap-event-plugin";

import InspireClient from "~/valaa-inspire/InspireClient";
import { Revelation, combineRevelationsLazily } from "~/valaa-inspire/Revelation";

import revelationTemplate from "~/valaa-inspire/revelation.template";

import { exportValaaPlugin, getGlobal, Logger, LogEventGenerator, outputError }
    from "~/valaa-tools";

import * as decoders from "./decoders";

injectTapEventPlugin();

const logger = new Logger();

const createInspireClientGlobalName = "createInspireClient";

export default createInspireClient;

export async function createInspireClient (...revelations: Revelation[]) {
  let ret;
  let revelationComponents;
  let combinedRevelation;
  const delayedPlugins = [];
  try {
    exportValaaPlugin({ name: "valaa-inspire", decoders });
    const Valaa = getGlobal().Valaa;
    if (Valaa.inspire || (typeof Valaa.plugins === "function")) {
      throw new Error("Valaa InspireClient already exists. There can be only one.");
    }

    revelationComponents = revelations.concat({ plugins: Valaa.plugins });
    logger.warn(`Initializing Inspire Application Gateway in environment (${
        String(process.env.NODE_ENV)}) by combining`, revelationComponents);

    Valaa.plugins = { push (plugin) { delayedPlugins.push(plugin); } };

    combinedRevelation = await combineRevelationsLazily(
        revelationTemplate,
        ...revelationComponents);
    logger.warn(`  revelation combined as`, combinedRevelation);

    ret = new InspireClient({ name: combinedRevelation.name, logger });

    await ret.initialize(combinedRevelation);
    ret.warnEvent(`InspireClient set to window.Valaa.inspire as`, ret);

    while (delayedPlugins.length) await ret.attachPlugin(delayedPlugins.shift());
    Valaa.plugins = { push (plugin) { ret.attachPlugin(plugin); } };

    getGlobal().inspireClient = ret;
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
