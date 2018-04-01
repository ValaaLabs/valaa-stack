import inherit from "~/valaa-inspire/ui/helper/inheritPresentation";
import uiComponent from "~/valaa-inspire/ui/base/UIComponent/presentation";

export default () => inherit(uiComponent, {
  textFieldEditor: {
    id: ({ key }) => key,
    style: {
      width: "100%",
      backgroundColor: "transparent",
    },
  },
});
