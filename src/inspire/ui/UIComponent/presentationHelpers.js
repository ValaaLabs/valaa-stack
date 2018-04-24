import merge from "lodash/merge";
import mapValues from "lodash/mapValues";

import { unthunkRepeat, isExpandable } from "~/inspire/ui/thunk";

export function presentationExpander (component, componentPath, initial, extraContext,
    baseContext) {
  // TODO(iridian): Push one dangling string in and other appears...
  // The management of _isUIComponent is hacky, but at least it allows us to now have a uniform
  // this.childProps. See below for details.
  const context = Object.assign(Object.create(baseContext || {}), component.context, extraContext);
  let raw = unthunkRepeat(component.rawPresentation(), context);
  if (componentPath) {
    raw = walkToPresentation(raw, componentPath, context);
  }
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "undefined") {
      throw new Error(`Presentation missing for '${componentPath}' in presentation`,
          component.rawPresentation(), "of", component);
    }
    return raw;
  }

  const expandDeep = object => (!isExpandable(object) || object._isUIComponent
      ? object
      : mapValues(object, child => expandDeep(unthunkRepeat(child, context)))
  );
  const expanded = expandDeep(raw);
  const wrapped = raw._isUIComponent ? { _presentation: expanded } : expanded;
  return !initial ? wrapped : merge(initial, wrapped);
}

// Returns non-expanded presentation for child at given path.
export function walkToPresentation (presentation, childPath, context) {
  const pathParts = !childPath ? [] : Array.isArray(childPath) ? childPath : childPath.split(".");
  return unthunkRepeat(
    pathParts.reduce(
      (subPresentation, pathPart) => {
        if (!subPresentation) return undefined;
        const subContext = Object.create(context);
        subContext.name = pathPart;
        return unthunkRepeat(subPresentation[pathPart], subContext);
      },
      presentation
    ),
    context
  );
}

