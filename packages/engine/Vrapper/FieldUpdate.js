// @flow

import type { VALKOptions } from "~/core/VALK";

import { Prophecy } from "~/prophet";
import { isCreatedLike } from "~/core/command";

import Vrapper from "~/engine/Vrapper";
import { arrayFromAny, Forkable } from "~/tools";

@Forkable
export default class FieldUpdate {
  _value: ?any;
  _previousValue: ?any;
  _fieldName: string;

  _emitter: Vrapper;
  _prophecy: ?Prophecy;

  _valkOptions: ?Object;
  _explicitValue: any;
  _vProphecyResource: ?Vrapper;

  constructor (emitter: Vrapper, fieldName: string, prophecy: ?Prophecy,
      valkOptions: ?VALKOptions = {}, explicitValue: any, vProphecyResource: ?Vrapper) {
    this._emitter = emitter;
    this._fieldName = fieldName;
    this._prophecy = prophecy;
    this._valkOptions = { ...(prophecy ? { state: prophecy.state } : {}), ...valkOptions };
    this._vProphecyResource = vProphecyResource;
    this._explicitValue = explicitValue;
  }

  value (): ?any {
    return this.hasOwnProperty("_value")
        ? this._value
        : (this._value = (typeof this._explicitValue !== "undefined")
            ? this._explicitValue
              // TODO(iridian): The non-pure kueries should be replaced with pure kueries?
            : this._emitter.do(this._fieldName, this._valkOptions));
  }

  previousValue (options: {} = {}) {
    if (!this.hasOwnProperty("_previousValue")) {
      try {
        this._previousValue =
            this._emitter.do(this._fieldName, this.previousStateOptions(options));
      } catch (error) {
        // TODO(iridian): This is a hacky solution to deal with the situation where previous value
        // did not exist before this event. A proper 'return undefined on undefined resources'
        // solution is needed for the above _emitter.do kuery.
        this._previousValue = undefined;
      }
    }
    return this._previousValue;
  }

  fieldName (): string { return this._fieldName; }
  emitter (): Vrapper { return this._emitter; }
  prophecy (): ?Prophecy { return this._prophecy; }
  valkOptions (): ?VALKOptions { return this._valkOptions; }
  previousStateOptions (extraOptions: Object = {}): VALKOptions {
    return { ...this._valkOptions, state: this._prophecy.previousState, ...extraOptions };
  }

  actualAdds () {
    if (!this._prophecy || isCreatedLike(this._prophecy.passage)) {
      const value = this.value();
      return arrayFromAny(value || undefined);
    } else if (this._prophecy.passage.actualAdds) {
      const ids = this._emitter._tryElevateFieldValueFrom(this._prophecy.state, this._fieldName,
          this._prophecy.passage.actualAdds.get(this._fieldName), this._vProphecyResource);
      return this._emitter.engine.getVrappers(ids, this._valkOptions);
    }
    return [];
  }

  // FIXME(iridian): sometimes actualRemoves returns vrappers of the removed entities with state
  // before the removal, in a context dependent fashion.
  // Details: if the far-side resource of the removed coupled field has been accessed earlier and
  // thus has an extant Vrapper that Vrapper is returned and its transient will be updated.
  // Otherwise a new Vrapper corresponding to previousState is returned.
  // The reason the new Vrapper is not pointing to new state is that if the resource was DESTROYED
  // the new state will not have corresponding data.
  actualRemoves () {
    if (!this._prophecy) return [];
    if (this._prophecy.passage.actualRemoves) {
      return this._emitter.engine.getVrappers(
          this._prophecy.passage.actualRemoves.get(this._fieldName), this.previousStateOptions());
    }
    if (this._prophecy.passage.type === "DESTROYED") {
      // TODO(iridian): .get is getting called twice, redundantly, in the DESTROYED branch.
      // The first call in createFieldUpdate is useless as no actualAdds get made.
      // TODO(iridian): The non-pure kueries should be replaced with pure kueries?
      const value = this._emitter.do(this._fieldName, this.previousStateOptions());
      return arrayFromAny(value || undefined);
    }
    return [];
  }
}
