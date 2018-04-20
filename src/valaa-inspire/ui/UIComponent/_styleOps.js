// @flow

import cloneDeepWith from "lodash/cloneDeepWith";

import { unthunkRepeat, isThunk } from "~/valaa-inspire/ui/thunk";

import type UIComponent from "./UIComponent";

export const VSSStyleSheetSymbol = Symbol("VSS.StyleSheet");

// TODO(iridian): Dead code.
export function _getVSSClasses (component: UIComponent, styleMediaProperty: Object,
    extraContext: ?Object) {
  const context = Object.create(component.getUIContext());
  if (extraContext) Object.assign(context, extraContext);
  const styleMediaData = component.getFocus().get(styleMediaProperty);
  // TODO: cache unthunked data somewhere?
  const unthunkedData = cloneDeepWith(unthunkRepeat(styleMediaData, context), value => //eslint-disable-line
    isThunk(value) ? unthunkRepeat(value, context) : undefined);
  return component.context.getVSSSheet(unthunkedData, component).classes;
}
