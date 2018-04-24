import inherit from "~/inspire/ui/inheritPresentation";
import uiComponent from "~/inspire/ui/UIComponent/presentation";

export default () => inherit(uiComponent, {
  root: () => ({
    style: {
      position: "fixed",
      bottom: 1,
      right: ({ show }) => show ? 0 : "-50vw", //eslint-disable-line
      width: "50vw",
      height: "100vh",
      WebkitTransition: "right 0.5s",
      display: "table-cell",
      verticalAlign: "bottom",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
    },
  }),
  output: {
    style: {
      overflowY: "auto",
      maxHeight: "calc(100% - 25px)",
      position: "absolute",
      bottom: "25px",
      width: "100%",
    },
  },
  inputForm: {
    style: {
      position: "absolute",
      bottom: 0,
      width: "100%",
      height: "25px",
    },
  },
  formInput: {
    style: {
      width: "100%",
    },
  },
});
