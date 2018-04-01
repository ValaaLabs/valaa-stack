// @flow
import inherit from "~/valaa-inspire/ui/helper/inheritPresentation";
import uiComponent from "~/valaa-inspire/ui/base/UIComponent/presentation";

export default () => inherit(uiComponent, {
  root: {
    style: {
      width: "100%",
      height: "100%",
    },
  },
});
