// @flow
import React from "react";
import { ContextMenuTrigger } from "react-contextmenu";

import UIComponent from "~/valaa-inspire/ui/base/UIComponent";

export default class ValaaContextMenuTrigger extends UIComponent {
  renderUIComponent () {
    if (!this.props.menuContent) {
      throw Error("ContextMenuTrigger needs the menu to be passed via 'menuContent' property");
    }
    return (
      <ContextMenuTrigger
        id={this.getMenuId(this.props.menuContent)}
        collect={this.props.menuContext}
      >
        {this.props.children}
      </ContextMenuTrigger>
    );
  }

  getMenuId (menuContent: any) {
    return `contextMenu_${menuContent.getRawId()}`;
  }
}

export class DefaultContextMenuTrigger extends UIComponent {
  renderUIComponent () {
    return (
      <div onContextMenu={this.defaultContextMenu}>
        {this.props.children}
      </div>
    );
  }

  defaultContextMenu = (event) => {
    event.stopPropagation();
  }
}
