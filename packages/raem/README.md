# @valos/raem provides Valaa Resources And Events Model `ValaaRAEM` (/vælɑːɹɛem/)

Provides the central Valaa technologies: the Valaa Resource Model and
the Valaa Event Model. Provides the connection between these in the
form of `reducers` which convert event streams into in-memory Valaa
resources and their updates. Provides schema definitions for `Resource`
and other essential Valaa resource model interfaces. Provides a kuery
language `VALK` for accessing and making limited manipulations to the
resources. Provides the low level APIs for manipulating partitions.
Implements `ghost instancing` for the Valaa resource model;
a generalization extension of the traditional prototypical inheritance
which recursively inherits the sub-components of the prototype as
transparent but selectively modifiable `ghosts`. Provides referential
integrity to the resource model via `couplings`.

- depends: `@valos/tools`, `immutable`
- exports: `Corpus`, `Command`, `VALK`, `RAEMContentAPI`
- ValaaSpace: `Resource`, `ResourceStub`, `Blob`, `Partition`
- concepts: `ghost instancing`, `partitions`, `couplings`


## 1. Valaa URIS, references and raw id's

Valaa reference URI (or just Valaa URI) is a URI used to specify a
reference to a Valaa Resource. It has two major parts separated by
the URI fragment separator `#`: *partition URI* part and a
*local reference* part.

*Partition URI* identifies the target authority and partition of
the reference. It corresponds to scheme, hierarchical and query parts
of an URI; everything but the fragment. Its precise structure and
interpretation is specified by the scheme but typically the scheme and
hierarchical part identify an authority and query part identifies
a partition.

*Local reference* identifies a particular resource inside a partition
but also contains optional *coupling*, *ghost path*, *lens* (and other)
parts which further parameterize the reference itself. It corresponds
to the URI fragment part but has sub-structure which is specified in
this document.

```
                                            reference URI
┌────────────────────────────────────────────────┴─────────────────────────────────────────────────┐
                  partition URI                                    local reference
┌───────────────────────┴────────────────────────┐ ┌───────────────────────┴───────────────────────┐
                         resource URI                                     reference options
┌──────────────────────────────┴─────────────────────────────────┐ ┌───────────────┴───────────────┐
         authority URI              partition id     resource id        coupling        lens name
┌──────────────┴──────────────┐    ┌──────┴──────┐ ┌──────┴──────┐ ┌───────┴────────┐ ┌─────┴──────┐

valaa-aws://example.com:123/dev?id=abcd-123...2343#987b-72f...8263?coupling=relations&lens=ROOT_LENS

└───┬───┘   └──────┬──────┘└┬─┘ └───────┬────────┘ └───────────────────────┬───────────────────────┘
 scheme        authority   path        query                         fragment
            └────────┬────────┘
             hierarchical part
```


#### 1.1. Curious pluralistic dualisms of *partition URI* and *local reference*

The division between partition URI and local reference has many curious
dualistic qualities: backend vs. frontend, hierarchical vs. flat,
routing vs. computation, extensible vs. fixed, absolute vs. contextual,
coarse vs. granular, self-contained vs. part-of-a-whole.

##### 1.1.1. Partition URI domain is backend, local reference domain is front-end

Valaa backends deal with the indivisible partitions and thus don't care
about the particularities of local references to individual resources.
This corresponds to how in web architecture URI fragments are not sent
to backend with resource requests. Conversely, Valaa frontends don't
care where a resource comes from once it has been loaded, but about its
identity, relationships and the parameters of those relationships. This
is reflected in how frontend code regularily drops the partition URI.

##### 1.1.2. Partition URI structure is specified by the scheme, local reference structure is specified by Valaa

By the nature of its distributed event sourcing architecture Valaa
focuses heavily on the frontend. The cross-compatibility between
components is driven by how new backends can integrate and talk with
existing front-end clients. This is facilitated by front-end plugin
systems which enables new valaa URI schemes to specify new routing
solutions and fundamentally new backend infrastructures, as long as
said infrastructures can route valaa event streams to clients. This
corresponds to how Valaa doesn't specify how a *partition URI*
identifies and locates partitions and authorities but leaves it to
the scheme specifications and their reference implementations of
frontend plugins.

##### 1.1.3. Partitions URI's identify self-contained wholes, resource references need their context

Web architecture specifies that all or none of the document is
retrieved. This corresponds to the behaviour of Valaa partitions which
are always retrieved as a whole. Partition URI's contain all and
nothing but the components which identify web resources, that is
everything but the fragment.

##### 1.1.4. Etc.

### 1.2. Resource id

Resources have id's, which are just raw strings with restricted
character set of [`-_0-9a-zA-Z`] or
[url-and-filename-ready base64url characters](https://tools.ietf.org/html/rfc4648#section-5).

Note: As of now resource raw id's must be globally unique: uuid v4 is
recommended.

Note: derived id's currently break character set requirement as they
use regular base64 encoding and can contain `+` and `/` . For backwards
compatibility they are permitted, but
[considered equal to the base64url](https://tools.ietf.org/html/rfc7515#appendix-C)
using `+` <-> `-`, `/` <-> `_` character mappings.

### 1.3. ValaaReference

Javascript class which implements Valaa reference URI and associated
operations.
