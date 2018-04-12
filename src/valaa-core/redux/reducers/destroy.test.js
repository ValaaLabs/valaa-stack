import { created, destroyed } from "~/valaa-core/command";
import { vRef } from "~/valaa-core/ValaaReference";
import getObjectTransient from "~/valaa-core/tools/denormalized/getObjectTransient";

import { createCoreTestHarness } from "~/valaa-core/test/CoreTestHarness";

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
      initialState: { owner: vRef("A_parent", "children"), name: "child2" },
    }),
    created({ id: "A_child2#1", typeName: "TestThing",
      initialState: {
        instancePrototype: vRef("A_child2"), name: "child2#2", owner: vRef("A_parent", "children"),
      },
    }),
  ];

  it("doesn't find resource after dispatching DESTROYED", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA, [
      destroyed({ id: "A_child1" }),
    ]);
    expect(getObjectTransient(harness.getState(), "A_child1", "Resource", undefined, false))
        .toEqual(null);
  });

  it("prevents DESTROYED if the resource has active instances", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA);
    expect(() => harness.dispatch(destroyed({ id: "A_child2" })))
        .toThrow(/destruction blocked/);
  });

  it("doesn't prevent DESTROYED if a preventing instance will also be destroyed", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA);
    expect(() => harness.dispatch(destroyed({ id: "A_parent" })))
        .not.toThrow(/destruction blocked/);
  });

  it("doesn't prevent DESTROYED for non-command", () => {
    const harness = createCoreTestHarness({ debug: 0 }, createBlockA);
    expect(() => harness.dispatch(destroyed({ id: "A_child2", partitions: {} })))
        .not.toThrow(/destruction blocked/);
  });
});
