import { wrapError } from "~/valaa-tools";

// TODO: investigate eval alternatives
export default function importFromString (source: string, explicitModuleGlobal?: Object) {
  try {
    const moduleGlobal = explicitModuleGlobal || createModuleGlobal();
    // Emulate node -style module import system for js files.
    moduleGlobal.exports = {};
    moduleGlobal.module = { exports: moduleGlobal.exports };
    // eslint-disable-next-line
    Function("window",
`with (window) (function () {
${source}
})();`
    )(moduleGlobal);
    const exports = moduleGlobal.module.exports;
    delete moduleGlobal.exports;
    delete moduleGlobal.module;
    return { global: moduleGlobal, exports };
  } catch (error) {
    throw wrapError(error, `During importFromString(), with:`,
        "\n\tsource:", { source });
  }
}

let sharedGlobalProxy;
let windowDescriptor;

export function getSharedGlobal () {
  if (!sharedGlobalProxy) {
    sharedGlobalProxy = _createForwarder(self || global, self || global);
  }
  return sharedGlobalProxy;
}

export function createModuleGlobal (explicitGlobalPrototype?: Object) {
  const ret = Object.create(explicitGlobalPrototype || getSharedGlobal());
  Object.defineProperty(ret, "window", { ...windowDescriptor, value: ret });
  ret.self = ret;
  ret.global = ret;
  return ret;
}

function _createForwarder (object, target) {
  let prototype = Object.getPrototypeOf(object);
  if (prototype !== Object.prototype) prototype = _createForwarder(prototype, target);
  const forwarder = Object.create(prototype);
  Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([propertyName, descriptor]) => {
    if (propertyName === "window") {
      windowDescriptor = descriptor;
      return;
    }
    const newDescriptor = { ...descriptor };
    if (descriptor.get) {
      newDescriptor.get = function () { return descriptor.get.call(target); };
    }
    if (descriptor.set) {
      newDescriptor.set = function (value: any) { return descriptor.set.call(target, value); };
    }
    if ((typeof descriptor.value === "function") && !descriptor.value.prototype) {
      // eslint-disable-next-line prefer-rest-params
      newDescriptor.value = function () { return descriptor.value.apply(target, arguments); };
    }
    Object.defineProperty(forwarder, propertyName, newDescriptor);
  });
  return forwarder;
}
