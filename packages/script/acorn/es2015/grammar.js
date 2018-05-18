import * as es5 from "~/script/acorn/es5/grammar";

/* eslint-disable max-len */

// Extensions to core ESTree AST node types for ES2015 grammar, see https://github.com/estree/estree/blob/master/es2015.md

// Programs

export interface Program extends es5.Program { sourceType: "script" | "module"; body: [ es5.Statement | ModuleDeclaration ]; }
// Parsers must specify `sourceType` as `"module"` if the source has been parsed as an ES6 module. Otherwise, `sourceType` must be `"script"`.

// Functions

export interface Function extends es5.Function { generator: boolean; }

// Statements

export interface ForOfStatement extends es5.ForInStatement { type: "ForOfStatement"; }

// Declarations

export interface VariableDeclaration extends es5.VariableDeclaration { kind: "var" | "let" | "const"; }

// Expressions

export interface Super extends es5.Node { type: "Super"; }
export interface CallExpression extends es5.CallExpression { callee: es5.Expression | Super; arguments: [ es5.Expression | SpreadElement ]; }
export interface MemberExpression extends es5.MemberExpression { object: es5.Expression | Super; }
// A `super` pseudo-expression.

export interface SpreadElement extends Node { type: "SpreadElement"; argument: es5.Expression; }
export interface ArrayExpression extends es5.ArrayExpression { elements: [ es5.Expression | SpreadElement | null ]; }
// CallExpression extensions in 'super' section, with 'arguments' having SpreadElement in it
// Spread expression, e.g., `[head, ...iter, tail]`, `f(head, ...iter, ...tail)`.

export interface AssignmentExpression extends es5.AssignmentExpression { left: es5.Pattern; }
// Note that pre-ES6 code was allowed to pass references around and so left was much more liberal; an implementation might choose to continue using old definition if it needs to support such legacy code.

export interface Property extends es5.Property { key: es5.Expression; method: boolean; shorthand: boolean; computed: boolean; }

export interface ArrowFunctionExpression extends es5.Function, es5.Expression { type: "ArrowFunctionExpression"; body: es5.BlockStatement | es5.Expression; expression: boolean; }
// A fat arrow function expression, e.g., `let foo = (bar) => { /* body */ }`.
// SpiderMonkey version: export interface ArrowExpression extends Function, Expression { type: "ArrowExpression"; params: [ Pattern ]; defaults: [ Expression ]; rest: Identifier | null; body: BlockStatement | Expression; generator: boolean; expression: boolean; }

export interface YieldExpression extends es5.Expression { type: "YieldExpression"; argument: es5.Expression | null; delegate: boolean; }
// A `yield` expression.

// Template Literals

export interface TemplateLiteral extends es5.Expression { type: "TemplateLiteral"; quasis: [ TemplateElement ]; expressions: [ es5.Expression ]; }
export interface TaggedTemplateExpression extends es5.Expression { type: "TaggedTemplateExpression"; tag: es5.Expression; quasi: TemplateLiteral; }
export interface TemplateElement extends Node { type: "TemplateElement"; tail: boolean; value: { cooked: string; raw: string; }; }

// Patterns

export interface AssignmentProperty extends Property { type: "Property"; /* inherited */ value: es5.Pattern; kind: "init"; method: false; }
export interface ObjectPattern extends es5.Pattern { type: "ObjectPattern"; properties: [ AssignmentProperty ]; }
// SpiderMonkey version: export interface ObjectPattern extends Pattern { type: "ObjectPattern"; properties: [ { key: Literal | Identifier, value: Pattern } ]; }
export interface ArrayPattern extends es5.Pattern { type: "ArrayPattern"; elements: [ es5.Pattern | null ]; }
export interface RestElement extends es5.Pattern { type: "RestElement"; argument: es5.Pattern; }
export interface AssignmentPattern extends es5.Pattern { type: "AssignmentPattern"; left: es5.Pattern; right: es5.Expression; }

// Classes

export interface Class extends Node { id: es5.Identifier | null; superClass: es5.Expression | null; body: ClassBody; }
export interface ClassBody extends Node { type: "ClassBody"; body: [ MethodDefinition ]; }
export interface MethodDefinition extends Node { type: "MethodDefinition"; key: es5.Expression; value: es5.FunctionExpression; kind: "constructor" | "method" | "get" | "set"; computed: boolean; static: boolean; }
export interface ClassDeclaration extends Class, es5.Declaration { type: "ClassDeclaration"; id: es5.Identifier; }
export interface ClassExpression extends Class, es5.Expression { type: "ClassExpression"; }
export interface MetaProperty extends es5.Expression { type: "MetaProperty"; meta: es5.Identifier; property: es5.Identifier; }

// Modules

export interface ModuleDeclaration extends Node { }
// A module `import` or `export` declaration.

export interface ModuleSpecifier extends Node { local: es5.Identifier; }
// A specifier in an import or export declaration.

// Imports

export interface ImportDeclaration extends ModuleDeclaration { type: "ImportDeclaration"; specifiers: [ ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier ]; source: es5.Literal; }
// An import declaration, e.g., `import foo from "mod";`.

export interface ImportSpecifier extends ModuleSpecifier { type: "ImportSpecifier"; imported: es5.Identifier; }
/*
An imported variable binding, e.g., `{foo}` in `import {foo} from "mod"` or `{foo as bar}` in
`import {foo as bar} from "mod"`. The `imported` field refers to the name of the export imported
from the module. The `local` field refers to the binding imported into the local module scope.
If it is a basic named import, such as in `import {foo} from "mod"`, both `imported` and `local`
are equivalent `Identifier` nodes; in this case an `Identifier` node representing `foo`. If it is
an aliased import, such as in `import {foo as bar} from "mod"`, the `imported` field is
an `Identifier` node representing `foo`, and the `local` field is an `Identifier` node
representing `bar`.
*/

export interface ImportDefaultSpecifier extends ModuleSpecifier { type: "ImportDefaultSpecifier"; }
// A default import specifier, e.g., `foo` in `import foo from "mod.js"`.

export interface ImportNamespaceSpecifier extends ModuleSpecifier { type: "ImportNamespaceSpecifier"; }
// A namespace import specifier, e.g., `* as foo` in `import * as foo from "mod.js"`.

// Exports
export interface ExportNamedDeclaration extends ModuleDeclaration { type: "ExportNamedDeclaration"; declaration: es5.Declaration | null; specifiers: [ ExportSpecifier ]; source: es5.Literal | null; }
// An export named declaration, e.g., `export {foo, bar};`, `export {foo} from "mod";` or `export var foo = 1;`.
// /Note: Having `declaration` populated with non-empty `specifiers` or non-null `source` results in an invalid state./

export interface ExportSpecifier extends ModuleSpecifier { type: "ExportSpecifier"; exported: es5.Identifier; }
/*
An exported variable binding, e.g., `{foo}` in `export {foo}` or `{bar as foo}` in
`export {bar as foo}`. The `exported` field refers to the name exported in the module. The `local`
field refers to the binding into the local module scope. If it is a basic named export, such as in
`export {foo}`, both `exported` and `local` are equivalent `Identifier` nodes; in this case
an `Identifier` node representing `foo`. If it is an aliased export, such as in
`export {bar as foo}`, the `exported` field is an `Identifier` node representing `foo`, and the
`local` field is an `Identifier` node representing `bar`.
*/

export interface ExportDefaultDeclaration extends ModuleDeclaration { type: "ExportDefaultDeclaration"; declaration: es5.Declaration | es5.Expression; }
// An export default declaration, e.g., `export default function () {};` or `export default 1;`.

export interface ExportAllDeclaration extends ModuleDeclaration { type: "ExportAllDeclaration"; source: es5.Literal; }
// An export batch declaration, e.g., `export * from "mod";`.
