// @flow

import "babel-polyfill";
import injectTapEventPlugin from "react-tap-event-plugin";

import InspireClient from "~/valaa-inspire/InspireClient";
import { getGlobal, Logger, outputError } from "~/valaa-tools";

injectTapEventPlugin();

const logger = new Logger();
const createInspireClientGlobalName = "createInspireClient";

export async function createInspireClient (revelationPath: string, revelationOverrides: Object) {
  let ret;
  try {
    logger.warn(`Starting Inspire Client init sequence in environment (${process.env.NODE_ENV
        }), loading revelation from ${revelationPath}`);
    ret = new InspireClient({ name: "main", logger });
    await ret.initialize(revelationPath, revelationOverrides);
    ret.warnEvent(`Inspire Client created and set to window.inspireClient as`, ret);
    getGlobal().inspireClient = ret;
    return ret;
  } catch (error) {
    outputError(ret.wrapErrorEvent(error, `createInspireClient(${revelationPath})`,
        "\n\trevelationOverrides:", revelationOverrides));
    throw new Error("Failed to initialize Inspire Client. See message log for more details.");
  }
}

if (window) {
  window[createInspireClientGlobalName] = createInspireClient;
}

export default createInspireClient;
