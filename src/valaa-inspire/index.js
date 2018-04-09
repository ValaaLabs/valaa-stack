// @flow

// TODO(iridian): valaa-inspire entry is possibly not the appropriate place for babel-polyfill:
// at the moment it still is the top level entry point, but this might change.
import "babel-polyfill";
import injectTapEventPlugin from "react-tap-event-plugin";

import InspireClient from "~/valaa-inspire/InspireClient";
import { getGlobal, Logger, outputError, request } from "~/valaa-tools";

import { schemePlugin as valaaLocalSchemePlugin } from "~/scheme-valaa-local";
import { schemePlugin as valaaTransientSchemePlugin } from "~/scheme-valaa-transient";

const schemePlugins = [
  valaaLocalSchemePlugin,
  valaaTransientSchemePlugin,
];

injectTapEventPlugin();

const logger = new Logger();
const createInspireClientGlobalName = "createInspireClient";

export async function createInspireClient (revelation: string) {
  let ret;
  try {
    logger.warn(`Starting Inspire Client init sequence in environment (${
        String(process.env.NODE_ENV)}), loading revelation`, revelation);
    ret = new InspireClient({ name: "main", logger });

    await ret.initialize(revelation || "project.manifest.json", { schemePlugins });

    getGlobal().inspireClient = ret;
    ret.warnEvent(`InspireClient set to window.inspireClient as`, ret);
    return ret;
  } catch (error) {
    outputError((ret || logger).wrapErrorEvent(error, `createInspireClient(), with`,
        "\n\trevelation:", revelation));
    throw new Error("Failed to initialize Inspire Client. See message log for more details.");
  }
}

export default createInspireClient;

if (window) {
  window[createInspireClientGlobalName] = createInspireClient;
}
