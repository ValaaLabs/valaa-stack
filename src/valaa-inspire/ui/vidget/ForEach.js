// @flow
import React from "react";
import PropTypes from "prop-types";

import UIComponent, { uiComponentProps } from "~/valaa-inspire/ui/base/UIComponent";

import { invariantifyArray } from "~/valaa-tools/invariantify";

const EMPTY = [];

export default class ForEach extends UIComponent {
  static propTypes = {
    ...UIComponent.propTypes,
    RootElement: PropTypes.any,
    rootProps: PropTypes.object,
    EntryUIComponent: PropTypes.any,
    entryProps: PropTypes.object,
    entryKeys: PropTypes.object,
  }

  attachSubscribers (focus: any, props: Object) {
    super.attachSubscribers(focus, props);
    invariantifyArray(focus, "ForEach.focus", {
      allowUndefined: true, allowNull: true,
    });
  }

  renderUIComponent (focus: any) {
    const EntryUIComponent = this.props.EntryUIComponent || UIComponent;
    const children = (focus || EMPTY).map((entry, forIndex) => {
      const propsOptions = {
        parentUIContext: this.getUIContext(),
        focus: entry,
        index: forIndex,
        context: { forIndex },
      };
      const initialProps = { ...(this.props.entryProps || {}) };
      return React.createElement(
          EntryUIComponent,
          this.props.entryKeys
              ? this.childProps(this.props.entryKeys[forIndex] || "", propsOptions,
                  initialProps)
              : uiComponentProps(propsOptions, initialProps),
          this.props.children);
    });
    if (!this.props.RootElement && !this.props.rootProps) return children;
    return React.createElement(
        this.props.RootElement || "div",
        this.props.rootProps || {},
        ...children,
    );
  }

}
