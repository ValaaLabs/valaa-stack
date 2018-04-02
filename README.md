# THIS PROJECT IS CONTINUED BY VALAA TECHNOLOGIES

This repository is no longer maintained. Development is continued by Valaa Technologies. [Repository can be found here](https://github.com/Valaa-Technologies/valaa-stack).

# Valaa Stack

Distributed platform of platforms, with minimal threshold of entry
for creating applications with familiar HTML5/CSS/JS and then
deploying, sharing and reusing not just the applications themselves,
but modules and the content as well, using a unified, powerful
resource model.

## Community

Valaa Stack is open source software released under an
[MIT license](https://github.com/ValaaLabs/inspire/blob/master/LICENSE).

## Installation

Undergoing reorganization.

Once done, valaa-manager (`valma`) can be used to deploy a local web
server which can serve an initial developer targeted landing page
(inside a `revelation`). This contains the Valaa javascript client
runtime (`Inspire`) and the main editor partition (`Zero`) as
preloaded `ValaaSpace` content. While this local Zero is primarily
aimed at developing in a local browser context (backed by `IndexedDB`)
it nevertheless is fundamentally fully capable of connecting and
manipulating to remote authority content when properly authenticated.

## Overview

Most of the Valaa infrastructure logic lies within the sub-modules of
the Inspire client javascript runtime which runs in user browsers.

Applications are created on top of this infrastructure in the form of
Valaa resources, which are stored in a globally shared `ValaaSpace`.
In order to efficiently show these applications to the user Inspire
loads only small parts of the whole ValaaSpace (called `partitions`)
inside the user's browser. It accomplishes this using `event streams`.

### Event stream circle of life

Inspire client connects to selected partitions inside remote
`authorities` to receive application and content event streams. It
then locally interprets these events as Valaa resources which contain
the structure, code, UI components and data all together making up the
application. Inspire then renders these to the user as a fully locally
interactive web page.

When user then interacts with the application and makes a modification
which should affect other users, Inspire sends this modification to
the appropriate remote authority as a `command`. The authority can
then authorize this command as a new event as part of its event stream.
When doing so the authority sends the new event to all other clients
who were registered to the content, thus completing the circle.

Everything that happens or is created in ValaaSpace is created using
this cycle. Zero, the primary ValaaSpace content editor, is merely
another Valaa application rendered by Inspire and has indeed been
primarily developed using itself (after a brief bootstrapping phase).

### Backend authorities can be simple

A minimal but complete backend authority needs to be two things:

- An `event sourcing` pub-sub hub and event log provider; to be able
  authorize (or reject) incoming commands into events and then publish
  these to clients who are subscribed to the relevant `partitions`, as
  well as provide full event logs when requested
- An immutable binary hosting provider: to receive blob content which
  is referred to by above events and then later deliver the content to
  clients requesting it.

Backend authorities are allowed and in fact expected to be much more
than this. Nevertheless, when even such minimal authorities are
combined with a way to deliver the Inspire runtime to users this
completes Valaa as a fully self-contained platform.

Note: tools for managing reference authority deplyoments will likely
be contained in a separate repository (as valma).

## Inspire components

Inspire client is divided into several sub-modules. For now they exist
in the same repository but eventually might be separated. They share
similarities in structure. valaa-inspire is the top level entry point.
Those extending the schema provide a root-level ContentAPI.js. Several
modules provide an incremental test harness under */test/*TestHarness.
valaa-tools contains assorted generic tools. Some shared concepts
between all the submodules:

- dev-depends: `jest`, `eslint`, `flow`, `babel`, `webpack`, `npm`
- depends: `lodash`, `graphql`, `es5`, `various polyfills`
- concepts: `event sourcing`, `distributed infrastructure`, `es6`


### valaa-core

The execution core. Provides the ability to `reduce` event streams
into in-memory Valaa resources and their updates. Provides schema
definitions for `Resource` and other essential Valaa resource model
interfaces. Provides a kuery language `VALK` for accessing and making
limited manipulations to the resources. Provides the low level APIs
for manipulating partitions. Implements `ghost instancing` for the
Valaa resource model, an extension of the traditional prototypical
inheritance which recursively inherits the sub-components of the
prototype as transparent but selectively modifiable `ghosts`.
Provides referential integrity to the resource model via `couplings`.

- depends: `valaa-tools`, `redux`, `immutable`
- exports: `Corpus`, `Command`, `VALK`, `CoreContentAPI`
- ValaaSpace: `Resource`, `ResourceStub`, `Blob`, `Partition`
- concepts: `ghost instancing`, `partitions`, `couplings`


### valaa-script

Extends the core with ValaaScript. It is a semantic, non-syntactic
extension of Javascript which seamlessly integrates Valaa resources
with the Javascript object model. Bridges the gap between Javascript
model and Valaa resource model by extensively extending the schema.
Provides an implementation for ValaaScript via transpilation into an
intermediate language in the form of VALK kueries.

- depends: `valaa-core`, `acorn`
- exports: `transpileValaaScript`, `VALSK`, `ScriptContentAPI`
- ValaaSpace: `Scope`, `Property`
- concepts: `ECMAScript2015`, `scope`, `transpilation`


### valaa-prophet

Provides event stream connectivity. This is not just to remote
authorities but also to local browser `IndexedDB` storage. Provides
a non-authoritative in-memory repository `FalseProphet`, which wraps
valaa-core and valaa-script. Provides command queueing and reformation
capabilities. Provides a client-side `ACID` `transaction` framework
with transparent ValaaScript integration. Provides blob content
caching and management pathways. Extends the schema with folder-like
structure as well as relation-like connectivity. Together these
provide fully offline mode readiness. Provides the backend event
stream  connectivity reference implementation with AWS using simple
REST lambdas and the AWS mqtt IoT as event pub-sub.

- depends: `valaa-script`, `IndexedDB`, `AWS IoT/S3/DynamoDB`
- exports: `FalseProphet`, `PartitionConnection`, `ProphetContentAPI`
- ValaaSpace: `Relatable`, `Entity`, `Media`, `Relation`,
- concepts: `ACID`, `authorities`, `pub-sub`, `offline readiness`


### valaa-engine

Provides the live proxies (`Vrappers`) to ValaaSpace resources with
`ValaaEngine`. Completes the modifcation and transaction frameworks
with the ability to create commands with the proxy objects. Provides
Media content interpreter framework, which allows converting
ValaaScript content inside ValaaSpace into executable code. This also
allows integrating existing javascript code through ValaaScript
seamless integration. Converts events into subscriber callbacks calls.
Together these enable fully live-updating ValaaScript code via VALK
kueries as intermediate language. Exposes ValaaScript standard API
into ValaaSpace as `Valaa` execution environment global scope
primitive, with which ValaaScript programs have full control over
computation, stream connectivity and rendering environment inside the
browser.

- depends: `valaa-prophet`
- exports: `ValaaEngine`, `Vrapper`, `VALEK`
- ValaaSpace: `Valaa.*`, `Object integration`
- concepts: `live kuery`, `code-as-content`, `3rd party libraries`


### valaa-inspire

Provides the runtime entry point and UI rendering integration using
`React`. Sets up the full ValaaStack. Manages initial authentication
and connects to the entry partition. Sets up the rendering module,
attaches it to DOM and renders the entry partition `LENS`. Renders
resources using attached `lens` Media files. Introduces a Media type
`VSX` (similar to `JSX`) specifically for this purpose, which allows
writing natural HTML but also embedding it with fully live ValaaScript
snippets. With promise-enabled rendering enables fully dynamic
ValaaSpace integration with the UI.

- depends: `valaa-engine`, `React`, `brace`
- exports: `createInspireClient`,
- ValaaSpace: `ValaaScope`, `If`, `ForEach`, `TextFileEditor`
- concepts: `model-view`, `HTML5/CSS/JS`, `rapid devevelopment`

## The promise and the claim

Client-side computation, fully self-referential unified resource
model, fundamentally live UI, full library integrations together with
scalable distributed event sourcing based infrastructure enables
uncompromising, no barrier of entry back-to-the-HTML5/CSS/JS-roots
hyper-rapid but still genuinely sustainable software development.

Let's see if this is true. _o/
