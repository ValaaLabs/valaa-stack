import * as es5 from "~/valaa-script/denormalized/es5";

/* eslint-disable max-len */

// Extensions to Core ESTree AST node types for ES2016 grammar, see https://github.com/estree/estree/blob/master/es2016.md

export type BinaryOperator = es5.BinaryOperator | "**";
export type AssignmentOperator = es5.AssignmentOperator | "**=";
