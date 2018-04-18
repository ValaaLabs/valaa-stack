// @flow
import inherit from "~/valaa-inspire/ui/inheritPresentation";
import uiComponent from "~/valaa-inspire/ui/UIComponent/presentation";

export const textFileEditor = inherit(uiComponent, {
  root: {
    style: {
      width: "100%",
      height: "100%",
    },
  }
});

export default () => inherit(uiComponent, {
  root: {
    style: {
      width: "100%",
      height: "100%",
    },
  },
  textFileEditor,
});
