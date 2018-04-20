// @flow

import React from "react";

import type UIComponent from "./UIComponent";

export function _enableError (component: UIComponent, error: string | Error) {
  component._errorMessage = _messageFromError(component, error);
  component.setState({ errorHidden: false });
  component.forceUpdate();
  return error;
}

export function _toggleError (component: UIComponent) {
  component.setState({ errorHidden: !component.state.errorHidden });
  component.forceUpdate();
}

export function _clearError (component: UIComponent) {
  component._errorMessage = null;
  component.setState({ errorHidden: false });
  component.forceUpdate();
}

export function _renderError (component: UIComponent, error: string | Error) {
  return (
    <div
      style={{
        color: "#f44336",
        backgroundColor: "#ffeb3b",
      }}
    >
      <p>
        There is an error with component component:
        <button onClick={component.toggleError}>
          {component.state.errorHidden ? "Show" : "Hide"}
        </button>
        <button onClick={component.clearError}>
          Clear
        </button>
      </p>
      {!component.state.errorHidden
          ? <pre style={{ fontFamily: "monospace" }}>{
              `${_messageFromError(component, error)}`
            }</pre>
          : null}
    </div>
  );
}

function _messageFromError (component: UIComponent, error: any) {
  if (typeof error === "string") return error;
  if (!error.customErrorHandler) return error.message;
  let message = error.originalMessage || error.message;
  const catenator = { error (...args) {
    message += `\n${args.map(entry => String(entry)).join(" ")}`;
  } };
  error.customErrorHandler(catenator);
  return message;
}
