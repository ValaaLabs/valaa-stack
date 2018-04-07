// @flow

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

export async function createInspireClient (revelationPath: string,
    revelationOverrides: Object = {}) {
  let ret;
  try {
    logger.warn(`Starting Inspire Client init sequence in environment (${
        String(process.env.NODE_ENV)}), loading revelation from ${revelationPath}`);
    ret = new InspireClient({ name: "main", logger });

    const revelation = await request({ url: revelationPath || "project.manifest.json" });

    for (const [optionName, override] of Object.entries(revelationOverrides || {})) {
      if (typeof override !== "undefined") revelation[optionName] = override;
    }
    await ret.initialize(revelation, { schemePlugins });

    getGlobal().inspireClient = ret;
    ret.warnEvent(`InspireClient set to window.inspireClient as`, ret);
    return ret;
  } catch (error) {
    outputError((ret || logger).wrapErrorEvent(error, `createInspireClient(${revelationPath})`,
        "\n\trevelationOverrides:", revelationOverrides));
    throw new Error("Failed to initialize Inspire Client. See message log for more details.");
  }
}

export default createInspireClient;

if (window) {
  window[createInspireClientGlobalName] = createInspireClient;
}
