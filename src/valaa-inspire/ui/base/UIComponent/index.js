// @flow
import React from "react";
import PropTypes from "prop-types";
import isEqual from "lodash/isEqual";
import cloneDeepWith from "lodash/cloneDeepWith";

import { tryConnectToMissingPartitionsAndThen } from "~/valaa-core/tools/denormalized/partitions";

import { createNativeIdentifier, isNativeIdentifier, getNativeIdentifierValue }
    from "~/valaa-script";

import { unthunkRepeat, isThunk } from "~/valaa-inspire/ui/helper/thunk";
import Vrapper, { VrapperSubscriber, FieldUpdate } from "~/valaa-engine/Vrapper";
import debugId from "~/valaa-engine/debugId";
import { Kuery, dumpKuery, dumpObject } from "~/valaa-engine/VALEK";
import Presentable from "~/valaa-inspire/ui/base/Presentable";

import { invariantify, invariantifyObject, invariantifyFunction, isPromise, outputError, wrapError }
    from "~/valaa-tools";

import { presentationExpander } from "./presentationHelpers";

let tryWrapInLivePropsAssistant;
let wrapInLivePropsAssistant;
let ValaaScope;

export const VSSStyleSheetSymbol = Symbol("VSS.StyleSheet");
export const ReactPropTypesKuery = PropTypes.instanceOf(Kuery);
export const ReactPropTypesKueryIsRequired = PropTypes.instanceOf(Kuery).isRequired;
ReactPropTypesKuery.noPropsInspirePostProcess = true;
ReactPropTypesKueryIsRequired.noPropsInspirePostProcess = true;

export function getScopeValue (scope: Object, name: string) {
  if (typeof scope === "undefined") return undefined;
  const value = scope[name];
  return isNativeIdentifier(value) ? getNativeIdentifierValue(value) : value;
}

export function setScopeValue (scope: Object, name: string, value: any) {
  scope[name] = (value instanceof Vrapper) && (value.tryTypeName() === "Property")
      ? createNativeIdentifier(value)
      : value;
}

export function clearScopeValue (scope: Object, name: string | Symbol) {
  delete scope[name];
}

@Presentable(require("./presentation").default, "UIComponent")
export default class UIComponent extends React.Component {
  static _defaultPresentation = () => ({ root: {} });

  static isUIComponent = true;

  static contextTypes = {
    css: PropTypes.func,
    getVssSheet: PropTypes.func,
    releaseVssSheets: PropTypes.func,
    engine: PropTypes.object,
    disabledLens: PropTypes.any,
    loadingLens: PropTypes.any,
    pendingLens: PropTypes.any,
  }

  static propTypes = {
    children: PropTypes.any, // children can also be a singular element.
    style: PropTypes.object,
    // If no uiContext nor parentUIContext the component is disabled. Only one of these two can be
    // given at the same time: if uiContext is given uiContext.focus is used directly,
    // otherwise parentUIContext.focus is taken as the focus and kuery is live-tracked against it.
    // If kuery is not given, parentUIContext.focus is used directly.
    uiContext: PropTypes.object,
    parentUIContext: PropTypes.object,
    focus: PropTypes.any,
    kuery: ReactPropTypesKuery,
    head: PropTypes.any, // obsolete alias for focus.
    locals: PropTypes.object,
    context: PropTypes.object,
    overrideLens: PropTypes.arrayOf(PropTypes.any),
    disabledLens: PropTypes.any,
    loadingLens: PropTypes.any,
    pendingLens: PropTypes.any,
  }

  static propsCompareModesOnComponentUpdate = {
    _presentation: "ignore",
    uiContext: "shallow",
    parentUIContext: "shallow",
    focus: "shallow",
    head: "shallow",
    locals: "shallow",
    context: "shallow",
  }

  static stateCompareModesOnComponentUpdate = {}

  constructor (props: any, context: any) {
    if (!tryWrapInLivePropsAssistant) {
      ({ tryWrapInLivePropsAssistant, wrapInLivePropsAssistant } = require("./LivePropsAssistant"));
      ValaaScope = require("../../vidget/ValaaScope").default;
    }
    super(props, context);
    invariantify(!(props.uiContext && props.parentUIContext),
        `only either ${this.constructor.name
            }.props.uiContext or ...parentUIContext can be defined at the same time`);
    invariantify(this.constructor.contextTypes.css,
        `${this.constructor.name}.contextTypes is missing css, ${
        ""}: did you forget to inherit super contextTypes somewhere? ${
        ""} (like: static ContextTypes = { ...Super.contextTypes, ...)`);
    this.state = { error: undefined, errorHidden: false };
    this._attachedSubscribers = {};
  }

  state: Object;
  _activeParentFocus: ?any;

  // React section: if overriding remember to super() call these base implementations

  componentWillMount () {
    try {
      this._activeParentFocus = this._getActiveParentFocus(this.props);
      this._updateFocus(this.props);
    } catch (error) {
      const finalError = wrapError(error,
          `Exception caught in ${this.debugId({ suppressKueries: true }
              )})\n .componentWillMount(), with:`,
          "\n\tuiContext:", this.state.uiContext,
          "\n\tstate:", this.state,
          "\n\tprops:", this.props,
      );
      outputError(finalError);
      this.enableError(finalError);
    }
    this._isMounted = true;
  }

  // If there is no local props focus, we track parent focus changes for props updates.
  _getActiveParentFocus (props: Object) {
    if (props.hasOwnProperty("focus") || props.hasOwnProperty("head") || !props.parentUIContext) {
      return undefined;
    }
    return props.parentUIContext.hasOwnProperty("focus")
        ? getScopeValue(props.parentUIContext, "focus")
        : getScopeValue(props.parentUIContext, "head");
  }

  componentWillReceiveProps (nextProps: Object, nextContext: Object,
      forceReattachListeners: boolean) {
    try {
      const nextActiveParentFocus = this._getActiveParentFocus(nextProps);
      if ((forceReattachListeners === true)
          || (nextProps.uiContext !== this.props.uiContext)
          || (nextProps.parentUIContext !== this.props.parentUIContext)
          || (this._activeParentFocus !== nextActiveParentFocus)
          || (nextProps.focus !== this.props.focus)
          || (nextProps.head !== this.props.head)
          || (nextProps.kuery !== this.props.kuery)
          || comparePropsOrState(nextProps.context, this.props.context, "shallow")
          || comparePropsOrState(nextProps.locals, this.props.locals, "shallow")) {
        this._activeParentFocus = nextActiveParentFocus;
        this._updateFocus(nextProps);
      }
    } catch (error) {
      const finalError = wrapError(error,
          `Exception caught in ${this.debugId({ suppressKueries: true }
              )})\n .componentWillReceiveProps(), with:`,
          "\n\tuiContext:", this.state.uiContext,
          "\n\tstate:", this.state,
          "\n\tprops:", this.props,
          "\n\tnextProps:", nextProps,
      );
      outputError(finalError);
      this.enableError(finalError);
    }
  }

  shouldComponentUpdate (nextProps: Object, nextState: Object, nextContext: Object): boolean { // eslint-disable-line
    try {
      const ret = comparePropsOrState(this.props, nextProps, "deep",
              this.constructor.propsCompareModesOnComponentUpdate, "props")
          || comparePropsOrState(this.state, nextState, "deep",
              this.constructor.stateCompareModesOnComponentUpdate, "state");
      // console.warn(`${this.debugId()}.shouldComponentUpdate:`, ret, this, nextProps, nextState);
      return ret;
    } catch (error) {
      const finalError = wrapError(error,
          `Exception caught in ${this.debugId({ suppressKueries: true }
              )})\n .shouldComponentUpdate(), with:`,
          "\n\tprops:", this.props,
          "\n\tnextProps:", nextProps,
          "\n\tstate:", this.state,
          "\n\tnextState:", nextState,
          "\n\tcontext:", this.context,
          "\n\tnextContext:", nextContext,
      );
      outputError(finalError);
      this.enableError(finalError);
    }
  }

  componentWillUnmount () {
    this._isMounted = false;
    this._detachSubscribers();
    if (this.context.releaseVssSheets) this.context.releaseVssSheets(this);
  }

  setState (newState: any, callback: any) {
    if (this._isMounted) super.setState(newState, callback);
    else {
      // Performance optimization: mutate state directly if not mounted or just mounting.
      // setState calls are queued and could result in costly re-renders when called from
      // componentWillMount, strangely enough.
      // TODO(iridian): I find this a bit surprising: I would expect React to precisely to do this
      // optimization itself in componentWillMount (ie. not calling re-render), so it might be
      // something else we're doing wrong with the codebase. But adding this here resulted in
      // cutting the render time fully in half.
      Object.assign(this.state,
          typeof newState === "function"
            ? newState(this.state, this.props)
            : newState);
      if (callback) callback();
    }
  }

  // Public API

  getValaa () { return this.context.engine.rootScope().Valaa; }

  getStyle () {
    return Object.assign({},
        (this.constructor._defaultPresentation().root || {}).style || {},
        this.style || {},
        this.props.style || {});
  }

  /**
   * Called from VSX via `VSS` alias setup in src/inspire/ui/helper/lens.js.
   * Takes a property that should point to a media file, unthunks the content and then looks up
   * the style sheet from the ui context
   */
  getVssClasses = (styleMediaProperty: Object, extraContext: ?Object) => {
    try {
      const context = Object.create(this.getUIContext());
      if (extraContext) Object.assign(context, extraContext);
      const styleMediaData = this.getFocus().get(styleMediaProperty);
      // TODO: cache unthunked data somewhere?
      const unthunkedData = cloneDeepWith(unthunkRepeat(styleMediaData, context), value => //eslint-disable-line
        isThunk(value) ? unthunkRepeat(value, context) : undefined);
      return this.context.getVssSheet(unthunkedData, this).classes;
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n .getVssClasses:`,
      "\n\tStyle media kuery:", [...dumpKuery(styleMediaProperty)],
      "\n\tcurrent props:", this.props,
      "\n\tstate:", this.state);
    }
  }

  _updateFocus (newProps: Object) {
    try {
      /*
      console.warn(this.debugId(), "._updateFocus",
          "\n\tnew props.uiContext:", newProps.uiContext,
          "\n\tnew props.parentUIContext:", newProps.parentUIContext,
          "\n\tnew props.head:", newProps.head,
          "\n\tnew props.focus:", newProps.focus,
          "\n\tnew props.kuery:", ...dumpKuery(newProps.kuery));
      //*/
      this._detachSubscribers();
      this._errorMessage = null;

      invariantify(!(newProps.uiContext && newProps.parentUIContext),
          `only either ${this.constructor.name
              }.props.uiContext or ...parentUIContext can be defined at the same time`);
      const uiContext = newProps.uiContext || newProps.parentUIContext;
      if (!uiContext) return;
      const focus =
          newProps.hasOwnProperty("focus") ? newProps.focus
          : newProps.hasOwnProperty("head") ? newProps.head
          : (typeof getScopeValue(uiContext, "focus") !== "undefined")
              ? getScopeValue(uiContext, "focus")
          : getScopeValue(uiContext, "head");
      if (typeof focus === "undefined") return;
      if (typeof newProps.kuery === "undefined") {
        this._createContextAndSetFocus(focus, newProps);
        return;
      }
      invariantify(newProps.parentUIContext, `if ${this.constructor.name
          }.props.kuery is specified then ...parentUIContext must also be specified`);
      if (this.state.uiContext) {
        this.setUIContextValue("focus", undefined);
        this.setUIContextValue("head", undefined);
      }
      this.attachKuerySubscriber("UIComponent.focus", focus, newProps.kuery, {
        scope: uiContext,
        onUpdate: (update: FieldUpdate) => {
          this._detachSubscribersExcept("UIComponent.focus");
          this._createContextAndSetFocus(update.value(), newProps);
        },
      });
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n ._updateFocus:`,
          "\n\tnew props:", newProps,
          ...(newProps.uiContext ? ["\n\tnew props.uiContext:", newProps.uiContext] : []),
          ...(newProps.parentUIContext
              ? ["\n\tnew props.parentUIContext:", newProps.parentUIContext] : []),
          ...(newProps.kuery ? ["\n\tnew props.kuery:", ...dumpKuery(newProps.kuery)] : []),
          "\n\tcurrent props:", this.props,
          "\n\tstate:", this.state,
      );
    }
  }

  _createContextAndSetFocus (newFocus: any, newProps: Object) {
    const uiContext = newProps.uiContext || this.state.uiContext
        || Object.create(this.props.parentUIContext);
    setScopeValue(uiContext, "focus", newFocus);
    setScopeValue(uiContext, "head", newFocus);
    if (newProps.locals) {
      console.error("DEPRECATED: ValaaScope.locals\n\tprefer: ValaaScope.context");
      for (const key of Object.keys(newProps.locals)) {
        setScopeValue(uiContext, key, newProps.locals[key]);
      }
    }
    if (newProps.context) {
      for (const key of Object.keys(newProps.context)) {
        setScopeValue(uiContext, key, newProps.context[key]);
      }
    }
    uiContext.reactComponent = this;
    const attachSubscribersWhenDone = () => {
      if (typeof newFocus === "undefined") return;
      if ((typeof newFocus !== "object") || !(newFocus instanceof Vrapper) || newFocus.isActive()) {
        this._attachSubscribers(newFocus, newProps);
        return;
      }
      // Exit directly if can not activate: destroyed, non-resource, unavailable etc.
      if (!newFocus.isInactive() && !newFocus.isActivating()) return;
      // Otherwise activate the focus and attach subscribers once done.
      (async () => {
        try {
          await newFocus.activate();
          if (!newFocus.isActive()) {
            throw new Error(`Resource ${newFocus.getRawId()} did not activate properly; ${
                ""} expected focus status to be 'Active', got '${newFocus.getPhase()}' instead`);
          }
          // Bail out if our newFocus is no longer the uiContext.focus. Some later update has
          // started a refresh cycle so let it finish the attach process.
          if (newFocus !== getScopeValue(uiContext, "focus")) return;
          this._attachSubscribers(newFocus, newProps);
        } catch (error) {
          outputError(wrapError(error, `During ${this.debugId()
                  }\n .createContextAndSetFocus, with:`,
              "\n\tnew focus:", ...dumpObject(newFocus),
              "\n\tnew props:", ...dumpObject(newProps),
              "\n\tnew uiContext:", ...dumpObject(uiContext),
              "\n\tthis:", ...dumpObject(this)));
        }
      })();
    };
    if (this.state.uiContext !== uiContext) {
      this.setState({ uiContext }, attachSubscribersWhenDone);
    } else {
      attachSubscribersWhenDone();
      this.forceUpdate();
    }
  }

  static propsCompareModesOnComponentUpdate = {
    _presentation: "ignore",
    reactComponent: "ignore",
  }

  _checkForInfiniteRecursion () {
    if (!this.state.uiContext || !this.state.uiContext.focus) return false;
    let context = this.state.uiContext;
    // eslint-disable-next-line
    while ((context = Object.getPrototypeOf(context))) {
      if ((context.focus === this.getFocus()) && (context.key === this.getUIContextValue("key"))) {
        if (context.reactComponent && (context.reactComponent.constructor === this.constructor)
            && !comparePropsOrState(context.reactComponent.props, this.props, "onelevelshallow",
              this.constructor.propsCompareModesOnComponentUpdate, "props")) {
          console.log("Infinite render recursion match found in component", this,
                  this.state.uiContext,
              "\n\tancestor props:", context.reactComponent.props,
              "\n\telement props:", this.props);
          const currentContext =
              Object.assign(Object.create(Object.getPrototypeOf(this.state.uiContext)),
                  this.state.uiContext);
          const error = wrapError(new Error("Infinite component render recursion detected"),
              `Exception caught in ${this.debugId()})\n ._createContextAndSetFocus(), with:`,
              "\n\tcurrent component UI context:", currentContext,
              "\n\tnew candidate focus:", this.getFocus().debugId(), this.getFocus(),
              "\n\tnew candidate props:", this.props,
              "\n\tidentical ancestor UI context:", context,
              "\n\tidentical ancestor focus:", context.focus.debugId(), context.focus,
              "\n\tidentical ancestor props:", context.reactComponent.props,
          );
          outputError(error);
          this.enableError(error);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns the current focus of this UI component or throws if this component is disabled.
   */
  getFocus (state = this.state) {
    const ret = this.tryFocus(state);
    invariantify(typeof ret !== "undefined", `${this.constructor.name
        }.getFocus() called when component is disabled (focus/head is undefined)`);
    return ret;
  }

  tryFocus (state = this.state) {
    const ret = getScopeValue(state.uiContext, "focus");
    return (typeof ret !== "undefined")
        ? ret
        : getScopeValue(state.uiContext, "head");
  }

  /**
   * Returns the current UI uiContext of this UI component or null if this component is disabled.
   */
  getUIContext () {
    return this.state.uiContext;
  }

  getUIContextValue (key: string | Symbol) {
    return getScopeValue(this.state.uiContext, key);
  }

  trySetUIContextValue (key: string | Symbol, value: any) {
    if (this.state.uiContext) this.setUIContextValue(key, value);
  }

  setUIContextValue (key: string | Symbol, value: any) {
    setScopeValue(this.state.uiContext, key, value);
  }

  tryClearUIContextValue (key: string | Symbol) {
    if (this.state.uiContext) this.clearUIContextValue(key);
  }

  clearUIContextValue (key: string | Symbol) {
    clearScopeValue(this.state.uiContext, key);
  }

  _attachedSubscribers: Object;
  style: Object;

  rawPresentation () {
    return this.props._presentation || this.constructor._defaultPresentation();
  }

  // Returns a fully expanded presentation map or entry at componentPath
  presentation (componentPath: any, { initial, extraContext = {}, baseContext, group }:
      { initial?: Object, extraContext?: Object, baseContext?: Object, group?: any } = {}) {
    return presentationExpander(
        this,
        componentPath,
        initial || { key: `-${componentPath}${typeof group !== "undefined" ? `/${group}` : ""}>` },
        extraContext,
        baseContext || this.getUIContext());
  }

  /**
   * Returns comprehensive props for a child element. Fetches and expands the presentation using
   * given 'name', as per presentation, using scope as extra context
   *
   * Includes:
   * key (generated)
   * head ()
   * scope ()
   * kuery (null)
   *
   * @param {any} name
   * @param {any} { index, head, kuery }
   */
  childProps (name: string, options:
      { group?: any, index?: any, kuery?: Kuery, head?: any, focus?: any, context?: Object } = {},
      initialProps: Object = this.presentation(name, { extraContext: options.context })) {
    try {
      const parentUIContext = this.getUIContext();
      invariantify(!options.uiContext, `childProps.options.uiContext must be undefined`);
      invariantify(parentUIContext, `childProps can only be called if getUIContext() is valid`);
      const nextOptions = { parentUIContext, name, ...options };
      if (nextOptions.hasOwnProperty("head")) {
        console.error("DEPRECATED: props.head\n\tprefer: props.focus");
        nextOptions.focus = nextOptions.head;
        delete nextOptions.head;
      }
      invariantify(
          (typeof nextOptions.focus !== "undefined") || (!nextOptions.hasOwnProperty("focus")),
          "childProps.focus must not be undefined if it is specified as an option");
      return uiComponentProps(nextOptions, initialProps);
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n .childProps(${name}), with:`,
          "\n\toptions:", options,
          "\n\tkey:", options.context && options.context.key,
          "\n\tprops:", this.props,
          "\n\tstate:", this.state,
          "\n\trawPresentation:", this.rawPresentation());
    }
  }

  // TODO(iridian): Remove this as redundant: presentation/childProps is creating the keys already.
  // some places are still not using presentation though and use this instead.
  key (prefix: string = "", suffix: string = "") {
    const infix = (this.getFocus() instanceof Vrapper) ? this.getFocus().getRawId() : "array";
    return `${prefix}${infix}${suffix}`;
  }

  debugId (options: ?{ suppressKueries?: boolean }) {
    const keyString = this.getUIContext() && this.getUIContext().hasOwnProperty("key") // eslint-disable-line
            ? `key: '${this.getUIContext().key}'`
        : (this.props.context && this.props.context.key)
            ? `key: '${this.props.context.key}'`
        : "no key";
    let focus = this.getUIContextValue("focus");
    if (typeof focus === "undefined") focus = this.getUIContextValue("head");
    return `${this.constructor.name}(${keyString}, focus: ${
        Array.isArray(focus)
            ? `[${focus.map(entry => debugId(entry, options)).join(", ")}]`
            : debugId(focus, options)
    })`;
  }


  /**
   * Attach a given subscriber with a particular given subscriberKey to this UIComponent.
   * A possible already existing subscriber with the same subscriberKey is detached.
   * All subscribers are detached when the component is destroyed or if the focus of this component
   * changes.
   *
   * Guide to consistent naming of subscriberKey:
   *
   * Basic fields: `${componentName}.${fieldNameOnHead}.${_subscribedFieldName}`
   *   example: "EditorNode.editTarget.name"
   *     starts from this.getFocus(), goes to focus.get("editTarget"), subscribes for "name" on it
   *
   * Properties: `${componentName}['${propertyName}']`
   *   example: "DialogueEditor['editTarget']
   *     subscribes implicitly field 'Property.value' if no followup
   *   example: "DialogueEditor['editTarget'].name"
   *     treats Property.value as Identifier and subscribes to 'name' of the Identifier.reference
   *
   * Kuery or complex subscribers: `${componentName}.(${ruleName})`
   *   example: "Field.(toShown)"
   *     subscribes to a complex rule or kuery called toShown of Field focus
   *
   * Others:
   *   example "PropertiesPanel.*"
   *     subscribes to all fields of PropertiesPanel focus
   *   example `EditorNode.relation#${vAddedRleation.rawId}.*`
   *     subscribes to all fields on a particularily identified relation
   *
   * @param {string} subscriberKey
   * @param {VrapperSubscriber} subscriber
   * @returns {VrapperSubscriber}
   */
  attachSubscriber (subscriberKey: string, subscriber: VrapperSubscriber): VrapperSubscriber {
    this.detachSubscriber(subscriberKey, { require: false });
    this._attachedSubscribers[subscriberKey] = subscriber;
    subscriber.setSubscriberInfo(subscriberKey, this);
    return subscriber;
  }

  detachSubscriber (subscriberKey: string, options: { require: boolean } = {}) {
    const registeredFocusSubscriber = this._attachedSubscribers[subscriberKey];
    if (!registeredFocusSubscriber) {
      if (options.require !== false) {
        console.warn("UIComponent.detachSubscriber, cannot find subscriber", subscriberKey);
      }
      return;
    }
    this._unregisterSubscriberEntry(registeredFocusSubscriber);
    delete this._attachedSubscribers[subscriberKey];
  }

  // Overridable callbacks. Remember to call base class implementations with super.

  /**
   * Override to update subscribers whenever the focus has changed.
   * If the focus is undefined disables this component.
   * Initiated from "componentWillMount" and "componentWillReceiveProps".
   * When subscribers are registered to the UIComponent itself using using attachSubscriber
   * deregistration happens automatically for the previous foci and when "componentWillUnmount".
   */
  attachSubscribers (focus: any, props: Object) { // eslint-disable-line no-unused-vars
    this._areSubscribersAttached = true;
  }

  attachKuerySubscriber (subscriberName: string, head: any, kuery: any, options: {
    onUpdate: (update: FieldUpdate) => void,
    noImmediateRun?: boolean,
    // ...rest are VALKOptions
  }) {
    let subscriber;
    try {
      if (typeof head === "undefined") {
        this.detachSubscriber(subscriberName, { require: false });
        return undefined;
      }
      invariantifyFunction(options.onUpdate, "attachKuerySubscriber.options.onUpdate");
      if ((typeof kuery === "object") && (kuery instanceof Kuery)) {
        subscriber = (head instanceof Vrapper ? head : this.context.engine)
            .run(head, kuery, options);
      } else {
        invariantifyObject(head, "attachKuerySubscriber.head (when kuery is a filter)",
            { instanceof: Vrapper });
        subscriber = head.subscribeToMODIFIED(kuery, options.onUpdate);
        options.onUpdate = undefined;
        invariantify(subscriber.triggerUpdate,
            "subscriber from engine.run must be valid subscriber object (must have .triggerUpdate)");
        if (!options.noImmediateRun) subscriber.triggerUpdate(options);
      }
      this.attachSubscriber(subscriberName, subscriber);
      return subscriber;
    } catch (error) {
      throw wrapError(error, `during ${this.debugId()}\n .attachKuerySubscriber(${
              subscriberName}), with:`,
          "\n\thead:", ...dumpObject(head),
          "\n\tkuery:", ...dumpKuery(kuery),
          "\n\toptions:", ...dumpObject(options),
      );
    }
  }

  _isMounted: boolean;
  _areSubscribersAttached: ?boolean;

  // Helpers

  _attachSubscribers (focus: any, props: Object) {
    if (this._areSubscribersAttached) return;
    this.attachSubscribers(focus, props);
    invariantify(this._areSubscribersAttached, `${this.constructor.name
        }().super.attachSubscribers not called from derived attachSubscribers`);
  }

  _detachSubscribers (/* focus: ?Vrapper */) {
    this._areSubscribersAttached = false;
    Object.keys(this._attachedSubscribers).forEach(
        key => this._unregisterSubscriberEntry(this._attachedSubscribers[key]));
    this._attachedSubscribers = {};
  }

  _detachSubscribersExcept (exceptKey: string) {
    this._areSubscribersAttached = false;
    const newSubscribers = { [exceptKey]: this._attachedSubscribers[exceptKey] };
    Object.keys(this._attachedSubscribers).forEach(key =>
        (key !== exceptKey) && this._unregisterSubscriberEntry(this._attachedSubscribers[key]));
    this._attachedSubscribers = newSubscribers;
  }

  _unregisterSubscriberEntry (entry: Object) {
    if (entry) {
      if (Array.isArray(entry)) entry.forEach(subscriber => subscriber.unregister());
      else entry.unregister();
    }
  }

  enableError (error: string | Error) {
    this._errorMessage = this._messageFromError(error);
    this.setState({ errorHidden: false });
    this.forceUpdate();
  }

  _messageFromError (error: Error) {
    if (typeof error === "string") return error;
    if (!error.customErrorHandler) return error.message;
    let message = error.originalMessage || error.message;
    const catenator = { error (...args) {
      message += `\n${args.map(entry => String(entry)).join(" ")}`;
    } };
    error.customErrorHandler(catenator);
    return message;
  }

  toggleError = () => {
    this.setState({ errorHidden: !this.state.errorHidden });
    this.forceUpdate();
  }

  clearError = () => {
    this._errorMessage = null;
    this.setState({ errorHidden: false });
    this.forceUpdate();
  }

  _renderError (error: string | Error) {
    return (
      <div
        style={{
          color: "#f44336",
          backgroundColor: "#ffeb3b",
        }}
      >
        <p>
          There is an error with this component:
          <button onClick={this.toggleError}>
            {this.state.errorHidden ? "Show" : "Hide"}
          </button>
          <button onClick={this.clearError}>
            Clear
          </button>
        </p>
        {!this.state.errorHidden
            ? <pre style={{ fontFamily: "monospace" }}>{`${this._messageFromError(error)}`}</pre>
            : null}
      </div>
    );
  }

  renderProcessedUIComponent (focus: any) {
    if (this.renderUIComponent) {
      const prePostProcess = this.renderUIComponent(focus);
      let ret = this.tryRenderLens(prePostProcess, "renderRoot");
      if (typeof ret === "undefined") {
        ret = (typeof prePostProcess === "object") ? prePostProcess : <span>{prePostProcess}</span>;
      }
      return ret;
    }
    return this.renderLensSequence(this.props.children);
  }

  renderLens (lens: any, lensName: string) {
    const ret = this.tryRenderLens(lens, lensName);
    return (typeof ret === "undefined") ? lens : ret;
  }

  tryRenderLens (lens: any, lensName: string) {
    try {
      switch (typeof lens) {
        case "undefined":
          return null;
        case "function": {
          const contextThis = this.getUIContextValue("this");
          return this.renderLens(lens.call(contextThis, this.getUIContext(), this), lensName);
        }
        case "symbol":
          return this.renderLensRole(lens, lensName);
        case "object":
          if ((lens === null) || isPromise(lens)) {
            return undefined;
          }
          if (React.isValidElement(lens)) {
            return tryWrapInLivePropsAssistant(this, lens, lensName);
          }
          if (lens instanceof Kuery) {
            const subName = `${lensName}-kuery`;
            // Delegates the kuery resolution to LivePropsAssistant.
            return wrapInLivePropsAssistant(this,
                React.createElement(UIComponent,
                    this.childProps(subName, {}, { overrideLens: [lens] })),
                subName);
          }
          if (lens instanceof Vrapper) {
            const blocker = lens.activate();
            if (blocker) return blocker;
            if (lens.hasInterface("Media")) {
              return this.renderLens(lens.mediaContent(), `${lensName}-media`);
            }
            console.error("DEPRECATED, SUBJECT TO CHANGE:",
                "VSX notation `{focus.foo}` sets focus.foo as the new focus, for now",
                "\n\tprefer: `{{ focus: focus.foo }}` (ie no-scope syntax) to set focus",
                "\n\tchange: the compact notation will be used for rendering focus.foo",
                "as a _lens_, WITHOUT changing the focus.",
                "\n\tin component:", this.debugId(), this);
            return React.createElement(ValaaScope,
                this.childProps(`${lensName}-legacy-focus`, { focus: lens }, {}));
          }
          if (Array.isArray(lens)) {
            let ret; // remains undefined if no entry tryRenderLens makes any changes
            let hasPromise;
            for (let i = 0; i !== lens.length; ++i) {
              const processedEntry = this.tryRenderLens(lens[i], `${lensName}-${i}`);
              if (typeof processedEntry !== "undefined") {
                if (isPromise(processedEntry)) hasPromise = true;
                if (!ret) ret = lens.slice(0, i);
                ret.push(processedEntry);
              } else if (ret) ret.push(lens[i]);
            }
            if (hasPromise) ret = Promise.all(ret);
            return ret;
          }
          if (Object.getPrototypeOf(lens) === Object.prototype) {
            const subName = `${lensName}-noscope`;
            return wrapInLivePropsAssistant(this,
                React.createElement(ValaaScope, this.childProps(subName, {}, { ...lens })),
                subName);
          }
          throw new Error(`Invalid lens value when trying to render ${lensName
              }, got value of type '${lens.constructor.name}'`);
        default:
          break;
      }
      return undefined;
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n .renderLens, with:`,
          "\n\tlensName:", lensName,
          "\n\tlens:", lens,
          "\n\ttypeof lens:", typeof lens);
    }
  }

  renderLensRole (role: string | Symbol, rootRoleName?: string) {
    const ret = this.tryRenderLensRole(role, rootRoleName);
    return (typeof ret === "undefined") ? null : ret;
  }

  tryRenderLensRole (role: string | Symbol, rootRoleName?: string) {
    const actualRootRoleName = rootRoleName || String(role);
    if (!rootRoleName) this.trySetUIContextValue(this.getValaa().rootRoleName, actualRootRoleName);
    const ret = _tryRenderLensRole(this, actualRootRoleName,
        (typeof role === "string") && role, (typeof role === "symbol") && role, false);
    if (!rootRoleName) this.tryClearUIContextValue(this.getValaa().rootRoleName);
    return ret;
  }

  renderLensSequence (sequence: any) {
    const array = this.arrayFromValue(sequence);
    const ret = this.tryRenderLensSequence(sequence, array);
    return (typeof ret !== "undefined") ? ret : array;
  }

  tryRenderLensSequence (sequence: any, array: any[] = this.arrayFromValue(sequence)) {
    let ret;
    for (let i = 0; i !== array.length; ++i) {
      const processedChild = this.tryRenderLens(array[i], `child-${String(i)}`);
      if (typeof processedChild !== "undefined") {
        if (!ret) ret = array.slice(0, i);
        ret.push(processedChild);
      } else if (ret) {
        ret.push(array[i]);
      }
    }
    return ret;
  }

  arrayFromValue (value: any) {
    if (typeof value === "undefined") return [];
    if (!Array.isArray(value)) return [value];
    return value;
  }

  // UI component render is divided into two phases: pre-rendering and post-processing.
  // Pre-rendering phase generates a valid inspire element tree, which post-processing in turn
  // converts into a valid react element tree. Pre-rendering is
  // Post-processing phase must always succeed; any conversions in this stage are thus by nature
  // local and immediate in nature. Biggest responsibility is converting inspire elements which
  // have live props (props with contained Kuery objects) inside LivePropsAssistant elements.
  render () {
    if (this._errorMessage || this._checkForInfiniteRecursion()) {
      return this._renderError(this._errorMessage);
    }
    let focus;
    let ret;
    try {
      try {
        if (this.props.overrideLens) {
          for (const override of this.props.overrideLens) {
            ret = this.renderLens(override, "override");
            if (ret !== null) break;
          }
        } else if (typeof this.state.uiContext === "undefined") {
          ret = this.renderLensRole("disabledLens");
        // eslint-disable-next-line
        } else if (typeof (focus = this.getUIContextValue("focus")) === "undefined") {
          ret = this.renderLensRole("pendingFocusLens");
        } else {
          /*
          console.warn(`${this.debugId()}.render()`,
              "\n\tfocus:", focus,
              "\n\tstate:", this.state,
              "\n\tprops:", this.props);
          //*/
          switch ((typeof focus === "object") && (focus instanceof Vrapper)
              ? focus.getPhase() : "") {
            default: {
              ret = this.renderProcessedUIComponent(focus);
              break;
            }
            case "Inactive":
              ret = this.renderLensRole("inactiveLens");
              break;
            case "Unavailable":
              ret = this.renderLensRole("unavailableLens");
              break;
            case "Destroyed":
              ret = this.renderLensRole("destroyedLens");
              break;
            case "Activating":
              ret = focus.activate();
              if (!isPromise(ret)) {
                if (!focus.isActivating()) return this.render();
                throw new Error(
                    "focus.activate didn't return a promise but focus is still activating");
              }
              break;
          }
        }
      } catch (error) {
        if (!tryConnectToMissingPartitionsAndThen(error, () => this.forceUpdate())) {
          throw error;
        }
        this.trySetUIContextValue(this.getValaa().Lens.unconnectedPartitionNames,
            (error.originalError || error).missingPartitions
                .map(entry => String(entry)).join(", "));
        try {
          ret = this.renderLensRole("connectingLens");
        } finally {
          this.tryClearUIContextValue(this.getValaa().Lens.unconnectedPartitionNames);
        }
      }
      if (isPromise(ret)) {
        ret.then(() => this.forceUpdate());
        ret = this.renderLensRole("delayedLens");
        if (isPromise(ret)) {
          ret = this.renderLensRole("disabledLens");
          if (isPromise(ret)) {
            throw new Error("disabledLens must never resolve to a promise");
          }
        }
      }
      // console.log(`${this.debugId()}.render() ret:`, ret, this);
      return ret;
    } catch (error) {
      const finalError = wrapError(error,
          `Exception caught in ${this.debugId({ suppressKueries: true })})\n .render(), with:`,
          "\n\tfocus:", ...dumpObject(focus),
          "\n\tuiContext:", this.state.uiContext,
          "\n\tstate:", this.state,
          "\n\tprops:", this.props,
      );
      outputError(finalError);
      this.enableError(finalError);
      return this._renderError(finalError);
    }
  }
}

export function isUIComponentElement (element: any) {
  return (typeof element.type === "function") && element.type.isUIComponent;
}

export function uiComponentProps (options: {
        name?: string, index?: any, group?: any, uiContext?: Object,
        parentUIContext?: Object, focus?: any, head?: any, kuery?: any
      } = {},
      props?: Object = {}) {
  const focus = options.hasOwnProperty("focus") ? options.focus : options.head;
  invariantify((typeof focus !== "undefined")
      || (!options.hasOwnProperty("focus") && !options.hasOwnProperty("head")),
      "uiComponentProps.focus value must not be undefined if 'focus' is a key in the props");
  if (options.uiContext) {
    invariantify(!options.parentUIContext && !options.kuery && (typeof focus === "undefined"),
        "uiComponentProps.focus and .kuery must be undefined when .uiContext is defined");
    props.uiContext = options.uiContext;
  } else {
    invariantifyObject(options.parentUIContext,
        "uiComponentProps.parentUIContext (when no .uiContext is given)", { allowEmpty: true });
    props.parentUIContext = options.parentUIContext;
    if (typeof focus !== "undefined") props.focus = focus;
    if (typeof options.kuery !== "undefined") props.kuery = options.kuery;
  }
  props.context = options.context || {};
  props.context.key = props.key = props.context.key
      || createComponentKey(typeof focus !== "undefined"
              ? focus
              : getScopeValue(props.uiContext || props.parentUIContext, "focus"),
          options.name || "", options);
  return props;
}

/**
 * Creates a locally unique key for an UIComponent.
 *
 * @export
 * @param {any} uiContext
 * @param {any} [kuery=VALEK.head()]
 * @param {any} keyIndex
 * @param {any} name
 * @returns
 */
export function createComponentKey (focus: any, name: string,
    { group = "-", index }: any): Object {
  const uniqueId = (typeof index === "undefined")
      && (focus instanceof Vrapper) && focus.getRawId();
  // Principle here is that if an entry has an uniqueId ie. a singular resource focus, then
  // combination of name, groupIndex and the uniqueId is enough to identify the element.
  // This means that for a particular name+groupIndex combination no two child components can have
  // the same focus. This is useful for lists with unique resources as entries, but which might
  // change order over time.
  // If focus is not a resource, the combination of element, name and group is used and
  // must fully identify the component.
  return uniqueId
      ? `-${name}/${group}>-@${uniqueId}`
      : `-${name}/${group}>-#${typeof index !== "undefined" ? index : "-"}`;
}

function _tryRenderLensRole (component: Object, rootName: string,
    roleName?: string, roleSymbol?: Symbol, checkIfAvailable?: boolean) {
  const Valaa = component.getValaa();
  const actualRoleName = roleName || Valaa.Lens[roleSymbol];
  const actualRoleSymbol = roleSymbol || Valaa.Lens[roleName];
  if (!actualRoleSymbol) throw new Error(`No Valaa.Lens role symbol for '${actualRoleName}'`);
  if (!actualRoleName) throw new Error(`No Valaa.Lens role name for '${String(actualRoleSymbol)}'`);
  if (checkIfAvailable) {
    const descriptor = component.context.engine.getHostObjectDescriptor(actualRoleSymbol);
    if (descriptor && (typeof descriptor.isLensAvailable === "function")
        && !descriptor.isLensAvailable(component, component.tryFocus())) {
      return undefined;
    }
  }
  try {
    if (component.props.hasOwnProperty(actualRoleName)) {
      const lensInProps = component.props[actualRoleName];
      if (typeof lensInProps === "undefined") {
        throw new Error(`Render role props.${actualRoleName
            } is specified but its value is undefined`);
      }
      const ret = component.renderLens(lensInProps, rootName);
      /*
      if (component.getFocus().getRawId() === "ff1fcf82-08b9-4daf-9c9b-398e0f036414") {
        console.log(component.debugId(), `_tryRenderLensRole(${rootName}): props[${
            actualRoleName}] =`, typeof lensInProps, lensInProps, ret);
      }
      */
      return ret;
    }
    const lensInUIContext = actualRoleSymbol && component.getUIContextValue(actualRoleSymbol);
    if (typeof lensInUIContext !== "undefined") {
      const ret = component.renderLens(lensInUIContext, rootName);
      /*
      if (component.getFocus().getRawId() === "ff1fcf82-08b9-4daf-9c9b-398e0f036414") {
        console.log(component.debugId(), `_tryRenderLensRole(${rootName
            }): uiContext[${actualRoleName}] =`, typeof lensInUIContext, lensInUIContext, ret);
      }
      */
      return ret;
    }
    const lensInReactContext = component.context[actualRoleName];
    if (typeof lensInReactContext !== "undefined") {
      const ret = component.renderLens(lensInReactContext, rootName);
      /*
      if (component.getFocus().getRawId() === "ff1fcf82-08b9-4daf-9c9b-398e0f036414") {
        console.log(component.debugId(), `_tryRenderLensRole(${rootName
            }): context[${actualRoleName}] =`, typeof lensInReactContext, lensInReactContext,
                ret);
      }
      */
      return ret;
    }
  } catch (error) {
    throw wrapError(error,
        `During ${component.debugId()}\n ._tryRenderLensRole, with:`,
        "\n\tactualRoleName:", actualRoleName,
        "\n\tactualRoleSymbol:", actualRoleSymbol);
  }
  /*
  if (component.getUIContext() && component.getFocus() && component.getFocus().getRawId
      && (component.getFocus().getRawId() === "ff1fcf82-08b9-4daf-9c9b-398e0f036414")) {
    console.log(component.debugId(), `_tryRenderLensRole(${rootName
        }): no match for [${actualRoleName}/${String(actualRoleSymbol)}] =`, undefined);
  }
  */
  return undefined;
}


/**
 * A template literal tag for referring to UI elements by name.
 *
 * Useful for forwarding UI mode implementations:
 * For example: <ValaaScope activeLens={LENS`fallbackLens`}> means that if activeLens is
 * requested the fallbackLens implementation is used for it.
 *
 * @export
 * @param {string} lookupLensNames
 * @param {...any[]} directLenses
 * @returns
 */
export function LENS (lookupLensNames: string[], ...directLenses: any[]) {
  return function (scope: any, component: Object) {
    console.error("DEPRECATED: LENS`", lookupLensNames.join("..."), "`",
          "\n\tprefer: lens role symbols in Valaa.Lens.*");
    for (let i = 0; i !== lookupLensNames.length; ++i) {
      try {
        const lookedUpLens = lookupLensNames[i] && component.tryRenderLensRole(lookupLensNames[i]);
        if (typeof lookedUpLens !== "undefined") return lookedUpLens;
        if (i < directLenses.length && typeof directLenses[i] !== "undefined") {
          return component.renderLens(directLenses[i], `LENS[i]`);
        }
      } catch (error) {
        throw wrapError(error,
            `During ${component.debugId()}\n .LENS, with:`,
            "\n\tlookupLensNames:", lookupLensNames,
            "\n\tdirectLenses:", directLenses,
            "\n\tcurrent index:", i);
      }
    }
    return null;
  };
}

function comparePropsOrState (leftObject, rightObject, defaultEntryCompare, entryCompares = {},
    type, debug) {
  if (isSimplyEqual(leftObject, rightObject)) return false;
  if ((typeof leftObject !== typeof rightObject)
      || (typeof leftObject !== "object") || (leftObject === null) || (rightObject === null)) {
    /*
    if (debug) {
      console.info(type, "objects differ:", leftObject, rightObject);
    }
    */
    return true;
  }
  const leftKeys = Object.keys(leftObject);
  const rightKeys = Object.keys(rightObject);
  if (leftKeys.length !== rightKeys.length) {
    /*
    if (debug) {
      console.info(type, "key counts differ:",
          leftKeys.length, rightKeys.length, leftKeys, rightKeys);
    }
    */
    return true;
  }
  for (const key of leftKeys) {
    if (!rightObject.hasOwnProperty(key)) {
      /*
      if (debug) {
        console.info(type, "right side missing key:", key);
      }
      */
      return true;
    }
    const entryMode = entryCompares[key] || defaultEntryCompare;
    if (entryMode === "ignore") continue;
    const left = leftObject[key];
    const right = rightObject[key];
    if (isSimplyEqual(left, right)) continue;
    if (entryMode === "shallow") {
      /*
      if (debug) {
        console.info(type, "shallow objects differ:", key, left, right);
      }
      */
      return true;
    }
    if (entryMode === "onelevelshallow") {
      if (!comparePropsOrState(left, right, "shallow", entryCompares, undefined, debug)) continue;

      /*
      if (debug) {
        console.info(type, "onelevelshallow objects differ:", key, left, right);
      }
      */
      return true;
    }
    if (!isEqual(left, right)) {
      /*
      if (debug) {
        console.info(type, "deep objects differ:", key, left, right);
      }
      */
      return true;
    }
  }
  return false;
}

function isSimplyEqual (left, right) {
  if (left === right) return true;
  if ((typeof left === "function") && (typeof right === "function") && left.name === right.name) {
    return true;
  }
  return false;
}
