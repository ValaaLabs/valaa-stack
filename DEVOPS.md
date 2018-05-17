# ValOS DevOps or grasping the Valaa Open System and dealing with the authorities

This document has two purposes. Firstly it provides the initial
specification of Valaa Open System and secondly it serves as the
introduction for [Development Operations](https://en.wikipedia.org/wiki/DevOps).

The main infrastructure concepts investigated in this document are the
vertical, purpose and people oriented `domains` and the horizontal,
service and tool oriented `utility layers`. Each domain makes use of
many utility layers - each utility layer serves several domains.

The main DevOps tools are `git` and `npm` boosted with the custom
Valaa Manager convenience tool `valma` (`vlm` on the command line).

Most domains are specified in other documents and `valma` is simple.
Thus utility layers form the bulk of this document and as such are
investigated last.

## 1. ValOS specification

ValOS specification is provided as quoted and numbered ValOS rules.

> `valos-vault-1.1`: `ValOS packages` are all npmjs.com packages with
> `@valos` scope which don't have cyclic dependencies with other
> `@valos` scope packages.

> `valos-vault-1.2`: Valaa Open System (`ValOS`) is defined to be the
> contents of all ValOS packages and nothing else.

> `valos-vault-1.3`: `ValOS specification` consists of all files in all
> ValOS packages whose path in the package matches the JS regex
> `/^specifications\/\w*.md$/` and nothing else.

> `valos-vault-1.4`: Rules in a package are considered to be more
> specific than the rules in its package dependency tree. More specific
> rules take precedence.

> `valos-vault-1.5`: All packages which conform to ValOS specification
> are called `Valaa packages`. These packages are inclusively
> considered part of the `Valaa ecosystem`.

## 2. ValOS `domains` are cross-stack slices, each with a well-defined purpose

> `valos-vault-2.1`: A `domain` is the collection of all the systems,
> interactions and dynamics which exclusively serve a particular
> purpose.
> `valos-vault-2.2`: A domain must define the purpose, describe its
> producers and consumers and should provide a direction for technical
> and operational structure as well.

For example the `kernel` domain provides the essential central Valaa
code for developing new Valaa infrastructure software. Its main
producers are the kernel software developers and its consumers are the
infrastructure software developers. It revolves around developing code
as library packages.

On the other hand the `infrastructure` domain provides Valaa services
on various infrastructure platforms. Its main producers are the DevOps
agents and its consumers are the ValaaSpace users. It revolves around
assembling, configuring and deploying components on live systems.

#### Of kernel and infrastructure, of software devs and DevOps agents, of roles and tasks, of extremes and continuums, or when an entrepreneur holds too many hats at once and everything transcends into facets of one grand abstraction

It is so that `kernel` is mostly about developers and the way they
check out, design, implement, test, review, integrate and publish code;
and likewise it is so that `infrastructure` is mostly about how DevOps
agents mind automation, communication, monitoring & QA, diagnostics,
reliability, risk management, improvement, etc.

But it is also that `kernel` work involves DevOps concerns and that
`infrastructure` work involves software development. A software must
see the infrastructural ecosystem around them and where they are
currently standing in it to understand their impact and consequences;
likewise a DevOps agent must know about software development best
practices to support their infrastructure development work.

A person thus is never exclusively a software developer or a DevOps
agent. Likewise also when project role calls for DevOps or when some
domain talks about a software developer these are just an indication on
how the tasks of that role are distributed in the software - operations
continuum.

## 3. `valma` - a convenience CLI to context-dependent command scripts

> `valos-vault-3.1`: valma is installed with `npm install -g valma`

This installs the global CLI command `vlm` (as an alias for `valma`).

At its core valma is just a command dispatcher to
`valma command scripts` in specific places.

> `valos-vault-3.2`: valma searches the category paths `./script`,
> `./bin`, `./node_modules/.bin/` and (the OS-specific variant of)
> `/usr/bin` in this order for a matching command script.

For example typing `vlm status` would forward the command to
`./script/valma-status.js` first if one exists and falling back to the
more generic versions if not, eventually resolving to the global
`/usr/bin/valma-status`.

> `valos-vault-3.3`: Packages can add valma command scripts using the
> npm package.json `bin` section and by prefixing the exported name
> with `valma-`.

> `valos-vault-3.4`: Running `vlm` with no arguments must list all
> available commands grouped by category in current directory context.

The usefulness of valma comes how these commands are now readily
discoverable. For example any commands from depended packages appear
under `depended` commands category.

> `valos-vault-3.5`: valma must not be used in programmatic contexts.

Valma is a manual CLI tool for discoverability and convenience of use.

Programmatic tools should make use of the [`npm scripts`](https://docs.npmjs.com/misc/scripts)
section and [`npx -c`](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b#21c4)
directly. Notably `npx -c` allows the seamless execution of code as if
it was in the `scripts` section: if the code tries to execute another
script which is not found in the current `scripts` the script can still
be found from a corresponding `bin`-export of some depended package.


## 4. ValOS `utility` layer provides a particular operational service for all

ValOS has four main utility layers: `files`, `packages`, `authorities`
and `partitions`. These layers form the core operational infrastructure
of ValOS.

### 4.1. Overview of utility layers

> `valos-vault-4.1.1`: An `utility` is a domain with a well-defined
> operational purpose.

> `valos-vault-4.1.2`: utility must explicitly define the `payload` it
> provides to its consumers as well as the providers, tools and
> workflows used to manage that payload.

Below is a rough correlation of similar concepts across utilities.

Utility    |Tool          |Payload                    |Providers   |Consumed via      |Upstream|Configuration |Modified via        |Produced via       |Authority  |Distributed via
-----------|--------------|---------------------------|------------|------------------|--------|--------------|--------------------|-------------------|-----------|------------------
files      |`git`         |files in `./*`             |github.com  |`git clone`       |N/A     |`.git/*`      |`branch` `commit`   |`git push` & PR    |human      |merge PR to & `git push master`
packages   |`npm`, `vlm`  |files in `/node_modules/..`|npmjs.com   |`depend` `require`|`files` |`package.json`|ups. `src/*` `bin/*`|upstream           |hybrid     |`assemble-package` `publish-package`
authorities|`vlm`         |APIs, site & gateway files |IaaS, custom|browsers, various |`files` |upstream *    |upstream *          |upstream           |hybrid     |`build-release` `deploy-release`
partitions |`vlm`, gateway|event logs, blobs          |authorities |event & blob APIs |N/A     |N/A           |gateway prophet     |command & blob APIs|authorities|automatic, custom

- `Utility` - the utility layer which is being described
- `Tool` - the name of the tool used to manipulate the payload and/or metadata
- `Payload` - the content or the service the utility delivers to consumers
- `Providers` - the authoritative source for the payload
- `Consumed via` - the mechanism used by a consumer to access the payload
- `Upstream` - the possible external source of payload updates
- `Configuration` - where the configuration of the utility itself is specified
- `Modifed via` - how to make local changes to the payload
- `Produced via` - how to request for a set of local changes to be distributed
- `Authority` - who accepts and distributes a change request
- `Distributed via` - how changes are made live to all consumers

Note that `files` and `partitions` don't have an external upstream and
thus these bands are the defining authority of all of their payload.

On the other hand `packages` and `authorities` use the `files` as their
external upstream: their payload is generated from the content in git
repositories. Making updates to such utility content thus requires:

1. modifying the corresponding upstream git repository
2. distributing the git changes (a PR followed with `git push master`)
3. distributing the utility update (`publish-package` or `deploy-release`).

Step 3 can be automated by tooling in particular domains as a response
to particularily formed git repository updates.

### 4.2. Files utility layer is git repositories persisted typically in github

[git](https://git-scm.com/) is the industry standard for version
managing sets of files in a non-centralized ecosystem. No additional
tools are provided because there is no need.

> `valos-vault-6.1`: ValOS tools should use git as the files provider.

While github.com is the de facto standard provider and the typical
choice it must *not* be _required_.

> `valos-vault-6.2`: All git providers must be fully supported by all
> ValOS tools and libraries.


## 4.3. Packages utility layer is shared, versioned, dependable sets of files stored as npmjs.com packages

> `valos-vault-4.3.1`: The packages utility payload is [npmjs.com packages](https://docs.npmjs.com/getting-started/packages)

These packages can be libraries, toolsets or prebuilt release
runtimes - any sets of files really. The raison d'être for packages is
when several different consumers depend on the same set of files which
are also expected to undergo periodic development. The files thus need
versioning, dependency management and automated distribution - this all
is provided by npm.

Note: npmjs.com is a javascript repository - this should not be a
problem as long as ValOS remains mostly javascript and config files. If
a need to diversity the languages arises
a [private npm registry](https://docs.npmjs.com/misc/registry#can-i-run-my-own-private-registry)
can be set up for that purpose.

valma package commands: `vlm assemble-packages` `vlm publish-packages`


## 4.4. Authorities utility layer is the authollery deployments on infrastructure services

> `valos-vault-4.4.1`: Authorities utility payload is a set of service
> APIs and their associated static content.

Notably this includes site HTTP landing pages, ValOS gateway runtimes
and other static files. Authority payload is primarily immutable; any
dynamic content served via authority APIs belongs to other
infrastructure domains (such as the `partitions` utility).

> `valos-vault-4.4.2`: Authorities payloads are typically provided by
> external infrastructure provider but can be also generated.

The upstream git repositories for authority payloads are called
`valaa AUTHority contrOLLEr repositoRY`s or `authollery`s. Updates to
the authority payloads are primarily done as modifications to the
corresponding authollery and then distributing those via release
deployments.

> `valos-vault-4.4.3`: autholleries must not be published as packages.

While autholleries make use of package.json and the npm dependency
management this provides, they can also contain considerable amounts of
static content. In addition there should be no reason to depend on
an authollery. Automatic release deployment systems should have access
to a authollery directly for building the release.

valma authollery commands: `vlm build-release` `vlm deploy-release`


### 4.4.1. Valaa authorities vs. ValOS authorities

Valaa authorities and any partition content they provide do not need to
be public. A Valaa authority is an authority which can be accessed
using a pure ValOS gateway with no plugins or with a gateway plugin
which conforms to the gateway plugin requirements (Note: these
requirements must be specified in such a way that gateway plugins
cannot interfere with other 'reasonably' written plugins).
A ValOS authority is a Valaa authority which can be accessed using
only ValOS plugins (including no plugins at all).


## 4.5. Partitions utility layer - the foundation of ValaaSpace

Event logs and blob content are the partitions payload and are consumed
by ValOS gateways. It is more extensively covered elsewhere and is
mentioned here for completeness; precious little infrastructural
tooling is provided for them yet.

Eventually various partition diagnostics tools will come in handy:
- Media content import/export tools
- Complete partition to file system hierarchy save/load tools
- Event log introspection and manipulation tools
- etc.


### 4.5.1. Valaa partitions vs. ValOS partitions

All partitions provided by Valaa authorities are Valaa partitions.
Additionally ValOS partitions are partitions which are both
1. provided by ValOS authorities, and
2. provided for an anonymous consumer with nothing but a client
   capable of running the ValOS gateway runtime the authority provides
   (with reasonable concessions for the authority to prevent DDOS
   attacks)

TODO(iridian): Figure out whether this is the actually most meaningful
               place to put this semantic border. A specific term for
               non-authenticated partitions capable of running only on
               standard runtime is useful, but how useful actually?


## 5. Kernel domain provides the core libraries

It does, indeed (this section pending better understanding on how to
write domain specifications).
