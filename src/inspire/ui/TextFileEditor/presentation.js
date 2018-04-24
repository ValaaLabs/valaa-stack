// @flow
import inherit from "~/inspire/ui/inheritPresentation";
import uiComponent from "~/inspire/ui/UIComponent/presentation";

export default () => inherit(uiComponent, {
  root: {
    style: {
      width: "100%",
      height: "100%",
    },
  },
});
