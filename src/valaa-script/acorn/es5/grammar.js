// Core ESTree AST node types for ES5, see https://github.com/estree/estree/blob/master/es5.md

/* eslint-disable max-len */


// # Node objects

// ESTree AST nodes are represented as `Node` objects, which may have any prototype inheritance but which implement the following interface:
export interface Node { +type: string; loc: SourceLocation | null; }

/*
The `type` field is a string representing the AST variant type. Each subtype of `Node` is documented below with the specific string of its `type` field. You can use this field to determine which interface a node implements.
The `loc` field represents the source location information of the node. If the node contains no information about the source location, the field is `null`; otherwise it is an object consisting of a start position (the position of the first character of the parsed source region) and an end position (the position of the first character after the parsed source region):
*/
export interface SourceLocation { source: string | null; start: Position, end: Position }

// Each `Position` object consists of a `line` number (1-indexed) and a `column` number (0-indexed):
export interface Position { line: number; column: number; }


// # Identifier

export interface Identifier extends Expression, Pattern { type: "Identifier"; name: string; }
// An identifier. Note that an identifier may be an expression or a destructuring pattern.


// # Literal

export interface Literal extends Node, Expression { type: "Literal"; value: string | boolean | null | number | RegExp; }
// A literal token. Note that a literal can be an expression.

export interface RegExpLiteral extends Literal { regex: { pattern: string; flags: string; }; }
/* The `regex` property allows regexes to be represented in environments that don’t
support certain flags such as `y` or `u`. In environments that don't support
these flags `value` will be `null` as the regex can't be represented natively.
*/


// # Programs

export interface Program extends Node { type: "Program"; body: [ Statement ]; }
// A complete program source tree.


// # Functions

export interface Function extends Node { id: Identifier | null; params: [ Pattern ]; body: BlockStatement; }
// A function [declaration](#functiondeclaration) or [expression](#functionexpression).


// # Statements

export interface Statement extends Node { }
// Any statement.

export interface ExpressionStatement extends Statement { type: "ExpressionStatement"; expression: Expression; }
// An expression statement, i.e., a statement consisting of a single expression.

export interface BlockStatement extends Statement { type: "BlockStatement"; body: [ Statement ]; }
// A block statement, i.e., a sequence of statements surrounded by braces.

export interface EmptyStatement extends Statement { type: "EmptyStatement"; }
// An empty statement, i.e., a solitary semicolon.

export interface DebuggerStatement extends Statement { type: "DebuggerStatement"; }
// A `debugger` statement.

export interface WithStatement extends Statement { type: "WithStatement"; object: Expression; body: Statement; }
// A `with` statement.


// ## Control Flow

export interface ReturnStatement extends Statement { type: "ReturnStatement"; argument: Expression | null; }
// A `return` statement.

export interface LabeledStatement extends Statement { type: "LabeledStatement"; label: Identifier; body: Statement; }
// A labeled statement, i.e., a statement prefixed by a `break`/`continue` label.

export interface BreakStatement extends Statement { type: "BreakStatement"; label: Identifier | null; }
// A `break` statement.

export interface ContinueStatement extends Statement { type: "ContinueStatement"; label: Identifier | null; }
// A `continue` statement.


// ## Choice

export interface IfStatement extends Statement { type: "IfStatement"; test: Expression; consequent: Statement; alternate: Statement | null; }
// An `if` statement.

export interface SwitchStatement extends Statement { type: "SwitchStatement"; discriminant: Expression; cases: [ SwitchCase ]; lexical: boolean; }
// A `switch` statement.

export interface SwitchCase extends Node { type: "SwitchCase"; test: Expression | null; consequent: [ Statement ]; }
// A `case` (if `test` is an `Expression`) or `default` (if `test === null`) clause in the body of a `switch` statement.


// ## Exceptions

export interface ThrowStatement extends Statement { type: "ThrowStatement"; argument: Expression; }
// A `throw` statement.

export interface TryStatement extends Statement { type: "TryStatement"; block: BlockStatement; handler: CatchClause | null; guardedHandlers: [ CatchClause ]; finalizer: BlockStatement | null; }
// A `try` statement. If `handler` is `null` then `finalizer` must be a `BlockStatement`.

export interface CatchClause extends Node { type: "CatchClause"; param: Pattern; guard: Expression | null; body: BlockStatement; }
// A `catch` clause following a `try` block.


// ## Loops

export interface WhileStatement extends Statement { type: "WhileStatement"; test: Expression; body: Statement; }
// A `while` statement.

export interface DoWhileStatement extends Statement { type: "DoWhileStatement"; body: Statement; test: Expression; }
// A `do`/`while` statement.

export interface ForStatement extends Statement { type: "ForStatement"; init: VariableDeclaration | Expression | null; test: Expression | null; update: Expression | null; body: Statement; }
// A `for` statement.

export interface ForInStatement extends Statement { type: "ForInStatement"; left: VariableDeclaration | Expression; right: Expression; body: Statement; each: boolean; }
// A `for`/`in` statement.


// ## Declarations

export interface Declaration extends Statement { }
// Any declaration node. Note that declarations are considered statements; this is because declarations can appear in any statement context.

export interface FunctionDeclaration extends Function, Declaration { type: "FunctionDeclaration"; id: Identifier; params: [ Pattern ]; defaults: [ Expression ]; rest: Identifier | null; body: BlockStatement | Expression; generator: boolean; expression: boolean; }
// A function declaration. Note that unlike in the parent interface `Function`, the `id` cannot be `null`.

export interface VariableDeclaration extends Declaration { type: "VariableDeclaration"; declarations: [ VariableDeclarator ]; kind: "var" }
// A variable declaration.

export interface VariableDeclarator extends Node { type: "VariableDeclarator"; id: Pattern; init: Expression | null; }
// A variable declarator.


// # Expressions

export interface Expression extends Node, Pattern { }
// Any expression node. Since the left-hand side of an assignment may be any expression in general, an expression can also be a pattern.

export interface ThisExpression extends Expression { type: "ThisExpression"; }
// A `this` expression.

export interface ArrayExpression extends Expression { type: "ArrayExpression"; elements: [ Expression | null ]; }
// An array expression.

export interface ObjectExpression extends Expression { type: "ObjectExpression"; properties: [ Property ]; }
// An object expression.

export interface Property extends Node { type: "Property"; key: Literal | Identifier; value: Expression; kind: "init" | "get" | "set"; }
// A literal property in an object expression can have either a string or number as its `value`. Ordinary property initializers have a `kind` value `"init"`; getters and setters have the kind values `"get"` and `"set"`, respectively.

export interface FunctionExpression extends Function, Expression { type: "FunctionExpression"; id: Identifier | null; params: [ Pattern ]; defaults: [ Expression ]; rest: Identifier | null; body: BlockStatement | Expression; generator: boolean; expression: boolean; }
// A `function` expression.

// ## Unary expressions

export interface UnaryExpression extends Expression { type: "UnaryExpression"; operator: UnaryOperator; prefix: boolean; argument: Expression; }
// A unary operator expression.
export type UnaryOperator = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
// A unary operator token.

export interface UpdateExpression extends Expression { type: "UpdateExpression"; operator: UpdateOperator; argument: Expression; prefix: boolean; }
// An update (increment or decrement) operator expression.
export type UpdateOperator = "++" | "--";
// An update (increment or decrement) operator token.

// ## Binary expressions

export interface BinaryExpression extends Expression { type: "BinaryExpression"; operator: BinaryOperator; left: Expression; right: Expression; }
// A binary operator expression.
export type BinaryOperator = "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in" | "instanceof";
// A binary operator token.

export interface AssignmentExpression extends Expression { type: "AssignmentExpression"; operator: AssignmentOperator; left: Pattern; right: Expression; }
// An assignment operator expression.
export type AssignmentOperator = "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&=";
// An assignment operator token.

export interface LogicalExpression extends Expression { type: "LogicalExpression"; operator: LogicalOperator; left: Expression; right: Expression; }
// A logical operator expression.
export type LogicalOperator = "||" | "&&";
// A logical operator token.

export interface MemberExpression extends Expression { type: "MemberExpression"; object: Expression; property: Identifier | Expression; computed: boolean; }
// A member expression. If `computed` is `true`, the node corresponds to a computed (`a[b]`) member expression and `property` is an `Expression`. If `computed` is `false`, the node corresponds to a static (`a.b`) member expression and `property` is an `Identifier`.

// ## Other expressions

export interface ConditionalExpression extends Expression { type: "ConditionalExpression"; test: Expression; alternate: Expression; consequent: Expression; }
// A conditional expression, i.e., a ternary `?`/`:` expression.

export interface CallExpression extends Expression { type: "CallExpression"; callee: Expression; arguments: [ Expression ]; }
// A function or method call expression.

export interface NewExpression extends Expression { type: "NewExpression"; callee: Expression; arguments: [ Expression ]; }
// A `new` expression.

export interface SequenceExpression extends Expression { type: "SequenceExpression"; expressions: [ Expression ]; }
// A sequence expression, i.e., a comma-separated sequence of expressions.

// # Patterns
// Destructuring binding and assignment are not part of ES5, but all binding positions accept `Pattern` to allow for destructuring in ES6. Nevertheless, for ES5, the only `Pattern` subtype is [`Identifier`](#identifier).

export interface Pattern extends Node { }
