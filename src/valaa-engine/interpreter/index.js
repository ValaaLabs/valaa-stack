import CSSInterpreter from "~/valaa-engine/interpreter/CSSInterpreter";
import ValaaScriptInterpreter from "~/valaa-engine/interpreter/ValaaScriptInterpreter";
import JavaScriptInterpreter from "~/valaa-engine/interpreter/JavaScriptInterpreter";
import PlainTextMediaInterpreter from "~/valaa-engine/interpreter/PlainTextMediaInterpreter";
import JSXInterpreter from "~/valaa-engine/interpreter/JSXInterpreter";
import VSXInterpreter from "~/valaa-engine/interpreter/VSXInterpreter";

export const getAllMediaInterpreters = () => [
  new CSSInterpreter(),
  new JavaScriptInterpreter(),
  new ValaaScriptInterpreter(),
  new PlainTextMediaInterpreter(),
  new JSXInterpreter(),
  new VSXInterpreter(),
];
