import inherit from "~/inspire/ui/inheritPresentation";
import uiComponent from "~/inspire/ui/UIComponent/presentation";

export default () => inherit(uiComponent, {
  expressionFieldEditor: {
    id: ({ key }) => key,
    style: {
      width: "100%",
      backgroundColor: "transparent",
    },
  },
});
