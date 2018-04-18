import inherit from "~/valaa-inspire/ui/inheritPresentation";
import uiComponent from "~/valaa-inspire/ui/UIComponent/presentation";

export default () => inherit(uiComponent, {
  textFieldEditor: {
    id: ({ key }) => key,
    style: {
      width: "100%",
      backgroundColor: "transparent",
    },
  },
});
