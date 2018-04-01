import * as es2015 from "~/valaa-script/denormalized/es2015";
import * as es5 from "~/valaa-script/denormalized/es5";

/* eslint-disable max-len */

// Extensions to Core ESTree AST node types for ES2017 grammar, see https://github.com/estree/estree/blob/master/es2017.md

export interface Function extends es2015.Function { async: boolean; }

export interface AwaitExpression extends es5.Expression { type: "AwaitExpression"; argument: es5.Expression; }
