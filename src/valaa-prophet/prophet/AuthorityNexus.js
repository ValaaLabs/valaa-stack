// @flow

import { getValaaURI } from "~/valaa-core/tools/PartitionURI";

import Prophet from "~/valaa-prophet/api/Prophet";

import { invariantify, LogEventGenerator } from "~/valaa-tools";

export default class AuthorityNexus extends LogEventGenerator {
  _authorityProphets: Object;
  _schemePlugins: Object;

  constructor (options: Object = {}) {
    super(options);
    this._schemePlugins = {};
    this._authorityConfigs = options.authorityConfigs || {};
    this._authorityProphets = {};
  }

  addSchemePlugin (schemePlugin: Object) {
    invariantify(!this._schemePlugins[schemePlugin.getURIScheme()],
        `URI scheme plugin for "${schemePlugin.getURIScheme()}" already exists`);
    this._schemePlugins[schemePlugin.getURIScheme()] = schemePlugin;
  }

  getSchemePlugin (uriScheme: string) {
    return this.getSchemePlugin(uriScheme, { require: true });
  }

  trySchemePlugin (uriScheme: string, { require } = {}) {
    const ret = this._schemePlugins[uriScheme];
    if (!require || (typeof ret !== "undefined")) return ret;
    throw new Error(`Unrecognized URI scheme "${uriScheme}"`);
  }

  getAuthorityProphet (authorityURI: URL | string) {
    return this.tryAuthorityProphet(authorityURI, { require: true });
  }

  tryAuthorityProphet (authorityURI: URL | string, { require } = {}) {
    const ret = this._authorityProphets[String(authorityURI)];
    if (!require || (typeof ret !== "undefined")) return ret;
    throw new Error(`Cannot find authority prophet for "${String(authorityURI)}"`);
  }

  obtainAuthorityProphetOfPartition (partitionURI: URL | string) {
    return this.obtainAuthorityProphet(
        this._getAuthorityURIFromPartitionURI(getValaaURI(partitionURI)));
  }

  obtainAuthorityProphet (authorityURI: URL | string) {
    let ret = this._authorityProphets[String(authorityURI)];
    if (typeof ret !== "undefined") {
      ret = this._authorityProphets[String(authorityURI)]
          = this._createAuthorityProphet(getValaaURI(authorityURI));
    }
    return ret;
  }

  _getAuthorityURIFromPartitionURI (partitionURI: URL): URL {
    return this._tryAuthorityURIFromPartitionURI(partitionURI, { require: true });
  }

  _tryAuthorityURIFromPartitionURI (partitionURI: URL, { require }: Object = {}): URL {
    let schemePlugin;
    try {
      schemePlugin = this.trySchemePlugin(partitionURI.protocol.slice(0, -1), { require });
      if (!schemePlugin) return undefined;
      const ret = schemePlugin.getAuthorityURIFromPartitionURI(partitionURI, { require });
      if (require && (typeof ret === "undefined")) {
        throw new Error(`Scheme "${partitionURI.protocol.slice(0, -1)
            }" could not determine authority URI of partitionURI "${String(partitionURI)}"`);
      }
      return ret;
    } catch (error) {
      throw this.wrapErrorEvent(error, `tryAuthorityURIFromPartitionURI("${String(partitionURI)}")`,
          "\n\tschemePlugin:", schemePlugin);
    }
  }

  _createAuthorityProphet (authorityURI: URL): Prophet {
    let schemePlugin;
    let authorityConfig;
    let ret;
    try {
      schemePlugin = this.getSchemePlugin(authorityURI.protocol.slice(0, -1));
      authorityConfig = this._authorityConfigs[String(authorityURI)];
      if (!authorityConfig) {
        authorityConfig = schemePlugin.createDefaultAuthorityConfig(authorityURI);
        if (!authorityConfig) {
          throw new Error(`No Valaa authority config found for "${String(authorityURI)}"`);
        }
      }
      return schemePlugin.createAuthorityProphet(authorityURI, authorityConfig, this);
    } catch (error) {
      throw this.wrapErrorEvent(error, `createAuthorityProphet("${String(authorityURI)}")`,
          "\n\tschemePlugin:", schemePlugin,
          "\n\tauthorityConfig:", authorityConfig,
          "\n\tconfigs:", this._authorityConfigs);
    }
  }
}
