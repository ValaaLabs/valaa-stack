// @flow
import PropTypes from "prop-types";
import UIComponent from "~/valaa-inspire/ui/base/UIComponent";

export default class If extends UIComponent {

  static propTypes = {
    ...UIComponent.propTypes,
    test: PropTypes.any,
  };

  renderProcessedUIComponent (focus: Object) {
    if (!this.props.test) return null;
    return super.renderProcessedUIComponent(focus);
  }
}
