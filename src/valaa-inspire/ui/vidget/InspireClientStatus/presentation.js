import inherit from "~/valaa-inspire/ui/helper/inheritPresentation";
import uiComponent from "~/valaa-inspire/ui/base/UIComponent/presentation";

export default () => inherit(uiComponent, {
  root: {
    style: { position: "fixed", left: "120px", top: "0px", zIndex: 10000 },
  },
  totalCommandCount: {
    style: {
      fontSize: ({ totalCommandCount }) =>
          (totalCommandCount <= 1 ? "40px" : `${80 + totalCommandCount}px`),
      color: ({ totalCommandCount }) =>
          (totalCommandCount === 0 ? "green" : totalCommandCount === 1 ? "yellow" : "red")
    },
  },
});
