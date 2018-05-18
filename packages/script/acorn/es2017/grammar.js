import * as es2015 from "~/script/acorn/es2015/grammar";
import * as es5 from "~/script/acorn/es5/grammar";

/* eslint-disable max-len */

// Extensions to core ESTree AST node types for ES2017 grammar, see https://github.com/estree/estree/blob/master/es2017.md

export interface Function extends es2015.Function { async: boolean; }

export interface AwaitExpression extends es5.Expression { type: "AwaitExpression"; argument: es5.Expression; }
