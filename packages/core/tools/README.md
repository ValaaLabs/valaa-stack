Functions for managing the denormalized, immutable-js representation of schema.

See immutable-js documentation for primer: https://facebook.github.io/immutable-js/
The denormalized layout of the data is described as following immutable-js API call:

const rawData = denormalizedRoot.getIn([schemaClassName, id, property, recursedProperty, ...]);

Where all levels of data are naturally either raw data or further immutable-js data structures.
Usually this denormalizedRoot is wrapped inside a redux framework store, like so:

const denormalizedRoot = reduxStore.getState();
