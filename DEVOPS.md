# Valaa DevOps, or how to manage the VALaa Common infRAstructure

This document describes the VALaa Common infRAstructure (`ValCra` -
like [Velcro(TM)](https://www.velcro.com/about-us/dontsayvelcro/) it
hooks and fastens all non-common infrastructure parts together) and its
tools specifically from the [Development Operations](https://en.wikipedia.org/wiki/DevOps)
perspective.

```
Valaa Common Infrastructure (ValCra) is defined to be the contents of
all npm packages in @valaa scope and nothing else.
```
```
All files in the `specifications/` directory of all ValCra packages
extend this specification universally (specification files elsewhere in
the packages only affect the package locally).
```

All rules and guidelines in this specification only affect ValCra
packages unless otherwise mentioned. It is recommended for other Valaa
packages to follow this specification (at the very least that makes it
easier to import them as ValCra packages later increasing their
accessibility).

### ValCra Bands, ValCra Domains and the `valma` CLI tool

The main DevOps perspectives of ValCra infrastructure are the
horizontal `bands` and the vertical `domains`.

The main DevOps tools are the familiar tools of `git` and `npm` plus
the custom VALaa MAnager CLI tool `valma`.

Each domain (`kernel`, `gateways`, `schemes`, `services`, etc.)
represents the DevOps lifecycle of particular type of functionality.
Each band (`files`, `packages`, `authorities`, `partitions`, etc.)
specifies a shared set of tools and workflows used to manage the
_payload_ of that band.
Each domain makes use of many bands - each band serves several domains.

Domains are by their nature specific and varied and are described in
other documents with the exception of `kernel` domain which is
described further below.

## ValCra Bands are the horizontal layers of infrastructure code, tools and configurations

There are four ValCra bands: `files`, `packages`, `authorities` and
`partitions`. They are the primary conceptual stages of ValCra logic to
functionally distinct layers, each with their own tools, providers,
payloads, consumers and various operations. This layering is specified
from the point of view of DevOps; an end user is likely to involve only
the `authorities` and `partitions` domains.

Below is a rough correlation of similar concepts across these domains.

Band        | Tool    | Providers       | Payload                    | Consumed using     | Upstream   | Configuration  | Modified via             | Contributed via      | Authority   | Distributed by
------------|---------|-----------------|----------------------------|--------------------|------------|----------------|--------------------------|----------------------|-------------|------------------
files       | `git`   | github.com, etc | files in `./*`             | `git clone`        | N/A        | `.git/*`       | `branch` `commit`        | `git push` & make PR | human       | merge PR to & `git push master`
packages    | `npm`   | npmjs.com       | files in `/node_modules/`  | `depend` `require` | files band | `package.json` | upstream `src/*` `bin/*` | upstream             | hybrid      | `assemble-package` `publish-package`
authorities | `valma` | IaaS, custom    | APIs, site & gateway files | browsers, various  | files band | upstream *     | upstream *               | upstream             | hybrid      | `build-release` `deploy-release`
partitions  | gateway | authorities     | event logs, blobs          | event & blob APIs  | N/A        | N/A            | gateway prophet          | command & blob APIs  | authorities | automatic, custom

- `Band` - the infrastructural layer which being described
- `Tool` - the name of the tool used to manipulate the band payload and/or metadata
- `Providers` - the authoritative source for band payload
- `Payload` - the content or service the band delivers to consumers
- `Consumed using` - the mechanism used by a consumer to access the payload
- `Upstream` - the possible external source of payload updates
- `Configuration` - where the configuration of the band itself is specified
- `Modifed via` - how to make local changes to the payload
- `Contributed via` - how to request for a set of local changes to be distributed
- `Authority` - who accepts and distributes a change request
- `Distributed by` - how changes are made live to all consumers

Note that `files` and `partitions` don't have an external upstream and
thus these bands are the primary authority of all of their own content.
On the other hand `packages` and `authorities` use the `files` band as
their external upstream. In practice this means that some or all of the
band content is stored as files inside the corresponding git
repositority. Making updates to such band content thus requires:

1. modifying the corresponding upstream git repository
2. distributing the git changes (a PR followed with `git push master`)
3. distributing the band update (`publish-package` or `deploy-release`).

Step 3 can be automated by tooling in particular domains as a response
to particularily formed git repository updates.


## `valma` - a convenience CLI to context-dependent command scripts

Installing valma is straightforward (well, soon anyway):
```
npm install -g valma
```
This installs the global CLI command `vlm` (as alias for `valma`).

At its core valma itself doesn't contain logic other than forwarding
the commands and their arguments to valma-command scripts in specific
places (`./script`, `./bin`, `./node_modules/.bin/` and the
OS-specific `/usr/bin`, in this order). For example typing `vlm status`
would forward the command to `./script/valma-status.js` first if one
exists and falling back to the more generic versions if not, eventually
resolving to the `/usr/bin/valma-status` symlink.

Packages can add valma command scripts to their package.json `bin`
section by prefixing the command name with `valma-`. The usefulness of
valma comes how these commands are now readily discoverable. Running
`vlm` with no arguments will list all available commands grouped by
category, with any commands from depended packages appearing under
`depended` commands category.

Valma is a convenience tool for manual CLI discoverability and use.
Programmatic tools should make use of the [`npm scripts`](https://docs.npmjs.com/misc/scripts)
section and [`npx -c`](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b#21c4)
directly. The latter allows the seamless execution of `scripts` section
scripts and if not found, falling gracefully back to `bin`-exported
scripts of the depended packages.

## Files band is managed with git and persisted in github

[git](https://git-scm.com/) is the industry standard for version
managing sets of files in a non-centralized ecosystem. No additional
tools are provided because there is no need. While other ValCra band
tools shall not outright require git to be the files provider tool
(valma might but only initially) using another tool needs proper
justification.

While github.com is similarily the de facto standard provider it must
*not* be _required_ by any tool: other git providers must be fully
supported by all ValCra tools and libraries.


## Packages band stores shared, versioned, dependable sets of files in npmjs.com

[npmjs.com packages](https://docs.npmjs.com/getting-started/packages)
are the packages band payload. These packages can be libraries,
toolsets or prebuilt release runtimes - any sets of files really. The
raison d'être for packages is when several different consumers depend
on the same set of files which are also expected to undergo periodic
development. The files thus need versioning, dependency management and
automated distribution - this all is provided by npm.

Note: npmjs.com is a javascript repository - this should not be a
problem as long as ValCra remains 100% javascript and config files.
Valamas aren't stored in npmjs.com and if a need to diversity the
languages arises a [private npm registry](https://docs.npmjs.com/misc/registry#can-i-run-my-own-private-registry)
can be set up for that purpose.

package valma commands: `vlm assemble-packages` `vlm publish-packages`


## Authorities band is deployed on infrastructure services

Authorities payload is a set of service APIs and their associated
static content provided by some external infrastructure provider.
Notably this includes site HTTP landing pages, ValCra gateway runtimes
and other static files. Authority payload is primarily immutable; any
dynamic content served via authority APIs belongs to other
infrastructure domains (such as the `partitions` band).

The upstream git repositories for authority payloads are called
VALaa Authority MAnagement or `valama` repositories. Updates to
the payload are primarily done via valama modifications and then
distributed via release deployments.

`valama` valma commands: `vlm build-release` `vlm deploy-release`


### Valaa authorities vs. ValCra authorities

Valaa authorities and any partition content they provide do not need to
be public. A Valaa authority is an authority which can be accessed
using a pure ValCra gateway with no plugins or with a gateway plugin
which conforms to the gateway plugin requirements (Note: these
requirements must be specified in such a way that gateway plugins
cannot interfere with other 'reasonably' written plugins).
A ValCra authority is a Valaa authority which can be accessed using
only ValCra plugins (including no plugins at all).


## Partitions band - the foundation of ValaaSpace

Event logs and blob content are the partitions payload and are consumed
by ValCra gateways. It is more extensively covered elsewhere and is
mentioned here for completeness; precious little infrastructural
tooling is provided for them yet.

Eventually various partition diagnostics tools will come in handy:
- Media content import/export tools
- Complete partition to file system hierarchy save/load tools
- Event log introspection and manipulation tools
- etc.


### Valaa partitions vs. ValCra partitions

All partitions provided by Valaa authorities are Valaa partitions.
Additionally ValCra partitions are partitions which are both
1. provided by ValCra authorities, and
2. provided for an anonymous consumer with nothing but a client
   capable of running the ValCra gateway runtime the authority provides
   (with reasonable concessions for the authority to prevent DDOS
   attacks)

TODO(iridian): Figure out whether this is the actually most meaningful
               place to put this semantic border. A specific term for
               non-authenticated partitions capable of running only on
               standard runtime is useful, but how useful actually?


## Kernel domain provides the core libraries

It does, indeed (this section pending better understanding on how to
write domain specifications).
