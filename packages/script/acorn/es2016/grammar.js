import * as es5 from "~/script/acorn/es5/grammar";

/* eslint-disable max-len */

// Extensions to core ESTree AST node types for ES2016 grammar, see https://github.com/estree/estree/blob/master/es2016.md

export type BinaryOperator = es5.BinaryOperator | "**";
export type AssignmentOperator = es5.AssignmentOperator | "**=";
