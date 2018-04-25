import inherit from "~/inspire/ui/inheritPresentation";
import { presentationExpander } from "~/inspire/ui/UIComponent/presentationHelpers";
import UIComponent from "~/inspire/ui/UIComponent";

const testUIComponent = () => ({
  _isUIComponent: true,
  root: {
    className: ({ css }) => css("TestComponent"),
    display: "inline",
  },
});

const testContext = {
  css: name => name,
};

const dummyPresentation = inherit(testUIComponent, {
  root: {
    display: "inline-block",
  },
  dummyValue: "fromDummy",
  componentInBase: inherit(testUIComponent, {
    from: "fromDummyComponent",
    recursedInBase: inherit(testUIComponent, {
      from: "recursedFromDummy",
    })
  }),
});

const complexPresentation = inherit(dummyPresentation, {
  componentInBase: {
    from: "fromComplex",
  },
});

describe("Basic presentation inherit constructs presentation tree", () => {
  it("merges inherited root-level basic properties correctly", () => {
    expect(dummyPresentation()._isUIComponent)
        .toEqual(true);
  });

  it("merges inherited nested overridden basic properties correctly", () => {
    expect(dummyPresentation().root.className(testContext))
        .toEqual("TestComponent");
  });

  it("merges inherited root-level overriding properties correctly", () => {
    expect(dummyPresentation().dummyValue)
        .toEqual("fromDummy");
  });

  it("merges inherited nested overriding properties correctly", () => {
    expect(dummyPresentation().root.display)
        .toEqual("inline-block");
  });

  it("merges inherited root-level non-overriding component properties correctly", () => {
    expect(dummyPresentation().componentInBase().from)
        .toEqual("fromDummyComponent");
  });

  it("merges inherited root-level overriding component properties correctly", () => {
    expect(complexPresentation().componentInBase().from)
        .toEqual("fromComplex");
  });

  it("merges inherited recursed non-overridden component properties correctly", () => {
    expect(complexPresentation().componentInBase().recursedInBase().from)
        .toEqual("recursedFromDummy");
  });
});

const dummyComponent = {
  context: testContext,
  props: {},
  rawPresentation () {
    return dummyPresentation;
  }
};

describe("presentationExpander expands sub-paths using given context", () => {
  it("retrieves a concrete value from sub-path with an expansion correctly", () => {
    expect(presentationExpander(dummyComponent, "root.className"))
        .toEqual("TestComponent");
  });

  it("places a sub-component of a path into _presentation", () => {
    expect(presentationExpander(dummyComponent, "componentInBase")
            ._presentation.recursedInBase().from)
        .toEqual("recursedFromDummy");
  });
});

describe("vss", () => {
  let testComponent;
  const mockClasses = { foo: "bar" };
  const mockStyleMediaProperty = {
    typeName: "Property",
    value: context => context.foo || "bar",
    value2: context => context.test || "qwerty",
    value3: context => context.notHere || "poiuyt",
    value4: "hello"
  };
  const mockContext = {
    getVSSSheet: jest.fn(),
    uiContext: {
      foo: "wooo"
    }
  };

  beforeEach(() => {
    testComponent = new UIComponent({ parentUIContext: {} }, mockContext);
    testComponent.state = {
      uiContext: {
        focus: { get: jest.fn(() => mockStyleMediaProperty) },
        ...mockContext.uiContext
      }
    };
    mockContext.getVSSSheet.mockReturnValueOnce({ classes: mockClasses });
  });
});
