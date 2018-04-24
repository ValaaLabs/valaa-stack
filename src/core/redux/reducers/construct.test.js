import { created, duplicated } from "~/core/command";
import { vRef } from "~/core/ValaaReference";

import { createCoreTestHarness } from "~/core/test/CoreTestHarness";

describe("CREATED/DUPLICATED", () => {
  beforeEach(() => {});

  const createBlockA = [
    created({ id: "A_grandparent", typeName: "TestThing" }),
    created({ id: "A_parent", typeName: "TestThing",
      initialState: { owner: vRef("A_grandparent", "children") },
    }),
    created({ id: "A_child1", typeName: "TestThing",
      initialState: { owner: vRef("A_parent", "children") },
    }),
    created({ id: "A_child2", typeName: "TestThing",
      initialState: { owner: vRef("A_parent", "children") },
    }),
  ];

  it("DUPLICATED with initialState override", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA, [
      duplicated({
        id: "A_parentCopy",
        duplicateOf: "A_parent",
        initialState: { name: "parent copy" },
      }),
    ]);
    expect(harness.run(vRef("A_parentCopy"), "name"))
        .toEqual("parent copy");
  });

  it("DUPLICATED mirrors ownership structure", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA, [
      duplicated({
        id: "A_parentCopy",
        duplicateOf: "A_parent",
        initialState: { name: "structure-test copy" },
      }),
    ]);
    expect(harness.run(vRef("A_parentCopy"),
            ["§->", "name"]))
        .toEqual("structure-test copy");
    expect(harness.run(vRef("A_parentCopy"),
            ["§->", "children", 0, "owner", "name"]))
        .toEqual("structure-test copy");
    expect(harness.run(vRef("A_parentCopy"),
            ["§->", "children", 1, "owner", "name"]))
        .toEqual("structure-test copy");
  });
});
