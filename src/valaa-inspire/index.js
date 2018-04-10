// @flow

// TODO(iridian): valaa-inspire entry is possibly not the appropriate place for babel-polyfill:
// at the moment it still is the top level entry point, but this might change.
import "babel-polyfill";
import injectTapEventPlugin from "react-tap-event-plugin";

import InspireClient from "~/valaa-inspire/InspireClient";
import { expose } from "~/valaa-inspire/Revelation";

import { isPromise, getGlobal, Logger, outputError } from "~/valaa-tools";

import { schemePlugin as valaaLocalSchemePlugin } from "~/scheme-valaa-local";
import { schemePlugin as valaaTransientSchemePlugin } from "~/scheme-valaa-transient";

const schemePlugins = [
  valaaLocalSchemePlugin,
  valaaTransientSchemePlugin,
];

injectTapEventPlugin();

const logger = new Logger();
const createInspireClientGlobalName = "createInspireClient";

export default createInspireClient;

export async function createInspireClient (revelation: string, revelationOverrides: Object) {
  let ret;
  try {
    logger.warn(`Starting Inspire Client init sequence in environment (${
        String(process.env.NODE_ENV)}), loading revelation`, revelation);
    ret = new InspireClient({ name: "main", logger });

    await ret.initialize(
        _combineOverridesLazily(revelation || "project.manifest.json", revelationOverrides),
        { schemePlugins });

    getGlobal().inspireClient = ret;
    ret.warnEvent(`InspireClient set to window.inspireClient as`, ret);
    return ret;
  } catch (error) {
    outputError((ret || logger).wrapErrorEvent(error, `createInspireClient(), with`,
        "\n\trevelation:", revelation));
    throw new Error("Failed to initialize Inspire Client. See message log for more details.");
  }
}

if (window) {
  window[createInspireClientGlobalName] = createInspireClient;
}

function _combineOverridesLazily (base: any, overrides: any) {
  return (!isPromise(base) && !isPromise(overrides))
      ? _override(base, overrides)
      : (async () => _callAll(await _override(await base, await overrides)));
}

async function _callAll (callableMaybe: Function | any): any {
  return (typeof callableMaybe !== "function") ? callableMaybe : _callAll(await callableMaybe());
}

function _override (base: Object, overrides: Object) {
  if (typeof overrides === "undefined") return base;
  if ((typeof overrides !== "object") || (overrides === null) || (base === null)) return overrides;
  // If base is a string and override an object
  if (typeof base !== "object") {
    const actualBase = expose(base);
    if (actualBase === base) return overrides;
    return _combineOverridesLazily(actualBase, overrides);
  }
  const ret = { ...base };
  for (const [key, override] of Object.entries(overrides)) {
    ret[key] = (typeof ret[key] === "undefined")
        ? override
        : _combineOverridesLazily(ret[key], override);
  }
  return ret;
}
