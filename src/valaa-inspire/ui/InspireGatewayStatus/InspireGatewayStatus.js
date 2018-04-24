// @flow
import React from "react";

import Presentable from "~/valaa-inspire/ui/Presentable";
import UIComponent from "~/valaa-inspire/ui/UIComponent";

import { beaumpify } from "~/valaa-tools";

@Presentable(require("./presentation").default, "InspireGatewayStatus")
export default class InspireGatewayStatus extends UIComponent {
  attachSubscribers (focus: any, props: Object) {
    super.attachSubscribers(focus, props);
    const inspireGateway = this.getValaa().gateway;
    if (inspireGateway) {
      inspireGateway.setCommandCountListener(this,
          (totalCommandCount: number, partitionCommandCounts: Object) =>
              this.setState({ totalCommandCount, partitionCommandCounts }));
    }
  }

  detachSubscribers () {
    const inspireGateway = this.getValaa().gateway;
    if (inspireGateway) inspireGateway.setCommandCountListener(this);
    super.detachSubscribers();
  }

  preRenderFocus () {
    return (
      <div {...this.presentation("root")}>
        <span
          {...this.presentation("totalCommandCount", { extraContext: this.state })}
          onClick={this.props.toggle}
        >
          {this.state.totalCommandCount}
        </span>
        {this.props.show && <div>{beaumpify(this.state.partitionCommandCounts)}</div>}
      </div>
    );
  }
}
