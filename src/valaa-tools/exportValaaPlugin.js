// @flow

import getGlobal from "./getGlobal";


/**
 * Adds the given plugin to global.Valaa.plugins; this makes the plugin available to the Valaa
 * application gateway.
 *
 * Plugin loading has three phases.
 * 1. First phase plugins are those that were pushed to Valaa.plugins before gateway init and are
 *    attached and thus available during gateway prologue narrations.
 * 2. Second phase plugins are those that are pushed to Valaa.plugins during gateway initialization.
 *    They are attached only after init is complete. They are thus not available during revelation
 *    prologues, but will be available before engines or user interfaces are deployed.
 * 3. Third phase plugins are those which are pushed to Valaa.plugins at any later stage. There is
 *    no guarantee that UI has been loaded.
 *
 * @export
 * @param {Object} plugin
 * @returns
 */
export default function exportValaaPlugin (plugin: Object) {
  const global_ = getGlobal();
  const Valaa = global_.Valaa || (global_.Valaa = {});
  (Valaa.plugins || (Valaa.plugins = [])).push(plugin);
  return plugin;
}
