// @flow
import UIComponent from "~/valaa-inspire/ui/base/UIComponent";
import Presentable from "~/valaa-inspire/ui/base/Presentable";
import FieldUpdate from "~/valaa-engine/Vrapper/FieldUpdate";
import VALEK from "~/valaa-engine/VALEK";

import wrapError from "~/valaa-tools/wrapError";

@Presentable(require("./presentation").default, "MediaContentEditor")
export default class MediaContentEditor extends UIComponent {
  attachSubscribers (focus: any, props: Object) {
    try {
      super.attachSubscribers(focus, props);
      this.attachKuerySubscriber(`FileEditor.content`, focus,
          VALEK.if(VALEK.toMediaContentField(),
              { then: VALEK.interpretContent({ mime: "text/plain" }) }),
              { onUpdate: this.onContentUpdate, scope: this.getUIContext() });
    } catch (error) {
      throw wrapError(error, `During ${this.debugId()}\n .attachSubscribers(), with:`,
          "\n\thead:       ", focus,
          "\n\tthis:       ", this);
    }
  }

  onContentUpdate = async (update: FieldUpdate) => {
    this.setState({ content: await update.value() });
  }
}
