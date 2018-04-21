// @flow
import React from "react";

import Presentable from "~/valaa-inspire/ui/Presentable";
import UIComponent from "~/valaa-inspire/ui/UIComponent";

import { beaumpify } from "~/valaa-tools";

@Presentable(require("./presentation").default, "InspireClientStatus")
export default class InspireClientStatus extends UIComponent {
  attachSubscribers (focus: any, props: Object) {
    super.attachSubscribers(focus, props);
    const inspireClient = this.getValaa().inspire;
    if (inspireClient) {
      inspireClient.setCommandCountListener(this,
          (totalCommandCount: number, partitionCommandCounts: Object) =>
              this.setState({ totalCommandCount, partitionCommandCounts }));
    }
  }

  detachSubscribers () {
    const inspireClient = this.getValaa().inspire;
    if (inspireClient) inspireClient.setCommandCountListener(this);
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
