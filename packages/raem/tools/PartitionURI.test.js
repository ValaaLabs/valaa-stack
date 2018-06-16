import {
  createPartitionURI, createValaaURI, getPartitionAuthorityURIStringFrom,
} from "~/raem/tools/PartitionURI";

describe("Basic operations", () => {
  it("roundtrips trivial uri 'foo:'", () => {
    const sourceURIString = "foo:";
    let roundTripURI;
    roundTripURI = createValaaURI(sourceURIString);
    expect(String(roundTripURI))
        .toEqual(sourceURIString);

    roundTripURI = createPartitionURI(sourceURIString);
    expect(String(roundTripURI))
        .toEqual(sourceURIString);

    const authorityURIString = getPartitionAuthorityURIStringFrom(roundTripURI);
    expect(String(authorityURIString))
        .toEqual(sourceURIString);
  });
});
