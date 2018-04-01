// @flow
import PropTypes from "prop-types";

import UIComponent from "~/valaa-inspire/ui/base/UIComponent";
import Presentable from "~/valaa-inspire/ui/base/Presentable";
import FieldUpdate from "~/valaa-engine/Vrapper/FieldUpdate";
import VALEK from "~/valaa-engine/VALEK";

import wrapError from "~/valaa-tools/wrapError";

@Presentable(require("./presentation").default, "FieldEditor")
export default class FieldEditor extends UIComponent {
  static propTypes = {
    ...UIComponent.propTypes,
    fieldName: PropTypes.string
  };

  attachSubscribers (focus: any, props: Object) {
    try {
      super.attachSubscribers(focus, props);
      this.attachKuerySubscriber(`FieldEditor["${props.fieldName}"]`, focus,
          VALEK.to(props.fieldName).nullable(), {
            onUpdate: this.onValueUpdate,
            scope: this.getUIContext(),
          });
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n .attachSubscribers(), with:`,
          "\n\thead:       ", focus,
          "\n\tthis:       ", this);
    }
  }

  onValueUpdate = (update: FieldUpdate) => {
    this.setState({ value: update.value() });
  }
}
