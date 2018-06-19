import {
  createPartitionURI, getValaaURI, createValaaURI, getPartitionAuthorityURIStringFrom,
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

  it("doesn't lose // from string uri with getValaaURI", () => {
    const uriString = "valaa-aws://l2t9gu7rw4.execute-api.eu-west-1.amazonaws.com/developtest?id=8afca35a-e64b-44d4-bc73-8902e609e040";
    const uri = getValaaURI(uriString);
    expect(String(uri))
        .toEqual(uriString);
  });
});
