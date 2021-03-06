// @flow

import { PartialRemovesTag } from "~/valaa-core/tools/denormalized/partialSequences";
import { BuiltinTypePrototype, ValaaPrimitive } from "~/valaa-script";

import VALEK, { expressionFromValue, expressionFromOperation } from "~/valaa-engine/VALEK";
import Vrapper from "~/valaa-engine/Vrapper";
import {
  createHostPrototypeFieldDescriptor, createHostMaterializedFieldDescriptor,
  createHostFunctionDescriptor, createHostPropertyDescriptor,
} from "~/valaa-engine/ValaaSpaceAPI/hostPropertyDescriptors";

import { wrapError, dumpObject } from "~/valaa-tools";

/**
 * Creates a Valaa-decorated Object constructor for use inside ValaaScript as the standard Object.
 * The decorator overrides all standard Object as well as all Object.prototype methods and
 * properties so that they work transparently with Valaa Resource's ie. Vrapper's.
 *
 * @export
 * @param {Object} valaa
 * @returns
 */
export default function createDecoratedObject (Valaa: Object,
    hostObjectDescriptors: Map<any, Object>) {
  const decoratedObject = function DecoratedObject (...rest) { return Object.call(this, ...rest); };
  decoratedObject.prototype = Object.prototype;

  function createArg0ValaaDispatcher (description: string, objectOperation: () => any,
      valaaOperation, valaaTypeOperation = objectOperation,
      valaaPrototypeOperation = objectOperation) {
    const ret = function objectDecoratorArg0Dispatcher (...rest) {
      const isValaa0 = (typeof rest[0] === "object") && (rest[0] !== null)
          && rest[0][ValaaPrimitive];
      return (!isValaa0 ? objectOperation
              : rest[0] instanceof Vrapper ? valaaOperation
              : BuiltinTypePrototype.isPrototypeOf(rest[0]) ? valaaTypeOperation
              : valaaPrototypeOperation)
          .apply(this, rest);
    };
    ret._valkDescription = description;
    ret._valkCaller = true;
    return ret;
  }

  function createArg01ValaaDispatcher (description: string, objectOperation: () => any,
      valaaOperation: () => any) {
    const ret = function objectDecoratorArg01Dispatcher (...rest) {
      const isValaa0 = (typeof rest[0] === "object") && (rest[0] !== null)
          && rest[0][ValaaPrimitive];
      const isValaa1 = (typeof rest[1] === "object") && (rest[1] !== null)
          && rest[1][ValaaPrimitive];
      return (!isValaa0 && !isValaa1 ? objectOperation : valaaOperation).apply(this, rest);
    };
    ret._valkDescription = description;
    ret._valkCaller = true;
    return ret;
  }

  decoratedObject.is = createArg01ValaaDispatcher("", Object.is, isWithResource);

  decoratedObject.create = createArg0ValaaDispatcher("", Object.create, createWithResource);
  decoratedObject.getPrototypeOf = createArg01ValaaDispatcher("", Object.getPrototypeOf,
      getPrototypeOfWithResource);
  decoratedObject.setPrototypeOf = createArg01ValaaDispatcher("", Object.setPrototypeOf,
      setPrototypeOfWithResource);

  decoratedObject.assign = assignValaa;
  decoratedObject.keys = createArg0ValaaDispatcher("", Object.keys, keysWithResource);
  decoratedObject.values = createArg0ValaaDispatcher("", Object.values, valuesWithResource);
  decoratedObject.entries = createArg0ValaaDispatcher("", Object.entries, entriesWithResource);

  decoratedObject.isFrozen = createArg0ValaaDispatcher("", Object.isFrozen, isFrozenWithResource);
  decoratedObject.freeze = createArg0ValaaDispatcher("", Object.freeze, freezeWithResource);
  decoratedObject.isSealed = createArg0ValaaDispatcher("", Object.isSealed, isSealedWithResource);
  decoratedObject.seal = createArg0ValaaDispatcher("", Object.seal, sealWithResource);

  decoratedObject.isExtensible = createArg0ValaaDispatcher("", Object.isExtensible,
      isExtensibleWithResource);
  decoratedObject.preventExtensions = createArg0ValaaDispatcher("", Object.preventExtensions,
      preventExtensionsWithResource);

  decoratedObject.defineProperties = createArg0ValaaDispatcher("", Object.defineProperties,
      definePropertiesWithResource);
  decoratedObject.defineProperty = createArg0ValaaDispatcher("",
      Object.defineProperty, definePropertyWithResource,
      definePropertyWithBuiltin, definePropertyWithPrototype);

  decoratedObject.getOwnPropertyDescriptor = createArg0ValaaDispatcher("",
      Object.getOwnPropertyDescriptor, getOwnPropertyDescriptorWithResource,
      getOwnPropertyDescriptorWithBuiltin, getOwnPropertyDescriptorWithPrototype);
  decoratedObject.getOwnPropertyDescriptors = createArg0ValaaDispatcher("",
      Object.getOwnPropertyDescriptors, getOwnPropertyDescriptorsWithResource,
      getOwnPropertyDescriptorsWithBuiltin, getOwnPropertyDescriptorsWithPrototype);
  decoratedObject.getOwnPropertyNames = createArg0ValaaDispatcher("",
      Object.getOwnPropertyNames, getOwnPropertyNamesWithResource,
      getOwnPropertyNamesWithBuiltin, getOwnPropertyNamesWithPrototype);
  decoratedObject.getOwnPropertySymbols = createArg0ValaaDispatcher("",
      Object.getOwnPropertySymbols, getOwnPropertySymbolsWithResource,
      getOwnPropertySymbolsWithBuiltin, getOwnPropertySymbolsWithPrototype);

  function isWithResource (/* left: Vrapper | any, right: Vrapper | any */) {
    throw new Error("isWithResource not implemented");
  }


  function createWithResource (/* vPrototype: Vrapper, descriptors?: Object */) {
    throw new Error("createWithResource not implemented");
  }

  function getPrototypeOfWithResource (vResource: Vrapper) {
    const options = this.__callerValker__ && { transaction: this.__callerValker__ };
    const ret = vResource.get("prototype", options);
    if (ret) return ret;
    return Valaa[vResource.getTypeName(options)].hostObjectPrototype;
  }

  function setPrototypeOfWithResource (/* vResource: Vrapper, vPrototype: Vrapper */) {
    throw new Error("setPrototypeOfWithResource not implemented");
  }

  function assignValaa (target: any, ...rest: any[]) {
    const options = { transaction: this.__callerValker__ };
    let combinedSources;
    if (rest.length === 1 && !(rest[0] instanceof Vrapper)) {
      combinedSources = rest[0];
    } else {
      combinedSources = {};
      for (const source of rest) {
        if (!(source instanceof Vrapper)) Object.assign(combinedSources, source);
        else {
          for (const property of source.get("properties", options)) {
            combinedSources[property.get("name", options)] = property.extractValue(options);
          }
        }
      }
    }
    if (!(target instanceof Vrapper)) {
      return Object.assign(target, combinedSources);
    }
    for (const propertyName in combinedSources) { // eslint-disable-line
      target.alterProperty(propertyName, VALEK.fromValue(combinedSources[propertyName]),
          Object.create(options));
    }
    return target;
  }
  assignValaa._valkDescription = "";
  assignValaa._valkCaller = true;

  const toValaaKeys = VALEK.to("properties")
      .filter(VALEK.isImmaterial().not()).map(VALEK.to("name"));
  function keysWithResource (vResource: Vrapper) {
    if (!vResource.hasInterface("Scope")) return [];
    return vResource.get(toValaaKeys, { transaction: this.__callerValker__ });
  }

  const toValaaValues = VALEK.to("properties")
      .filter(VALEK.isImmaterial().not()).map(VALEK.extractValue());
  function valuesWithResource (vResource: Vrapper) {
    if (!vResource.hasInterface("Scope")) return [];
    return vResource.get(toValaaValues, { transaction: this.__callerValker__ });
  }

  const toEntriesWithResource = VALEK.to("properties")
      .filter(VALEK.isImmaterial().not()).map(VALEK.array(VALEK.to("name"), VALEK.extractValue()));
  function entriesWithResource (vResource: Vrapper) {
    if (!vResource.hasInterface("Scope")) return [];
    return vResource.get(toEntriesWithResource, { transaction: this.__callerValker__ });
  }


  function isFrozenWithResource (vResource: Vrapper) {
    return vResource.get("isFrozen", { transaction: this.__callerValker__ });
  }

  function freezeWithResource (vResource: Vrapper) {
    vResource.setField("isFrozen", true, { transaction: this.__callerValker__ });
    return vResource;
  }

  function isSealedWithResource (vResource: Vrapper) {
    // TODO(iridian): This only works as long as sealWithResource is not implemented.
    return vResource.get("isFrozen", { transaction: this.__callerValker__ });
  }

  function sealWithResource (/* vResource: Vrapper */) {
    throw new Error("sealWithResource not implemented");
  }

  function isExtensibleWithResource (vResource: Vrapper) {
    // TODO(iridian): This only works as long as preventExtensionsWithResource is not implemented.
    return !vResource.get("isFrozen", { transaction: this.__callerValker__ });
  }

  function preventExtensionsWithResource (/* vResource: Vrapper */) {
    throw new Error("preventExtensionsWithResource not implemented");
  }

  function definePropertiesWithResource (/* vResource: Vrapper */) {
    throw new Error("definePropertiesWithResource not implemented");
  }

  function definePropertyWithResource (vResource: Vrapper, property: string | Symbol,
      descriptor: Object) {
    const options = { transaction: this.__callerValker__ };
    const Type = Valaa[vResource.getTypeName(options)];
    const prototypeEntry = Type.hostObjectPrototype[property];
    try {
      if ((typeof prototypeEntry === "object") && (prototypeEntry !== null)
          && prototypeEntry.writableFieldName) {
        // Define a native field value
        // TODO(iridian): handle other descriptor parameters (at least check they're valid).
        if (!descriptor.hasOwnProperty("value")) {
          throw new Error(`descriptor.value is missing when trying to define a native field '${
              String(property)}'`);
        }
        vResource.setField(prototypeEntry.writableFieldName, descriptor.value,
            { transaction: this.__callerValker__ });
      } else if (!vResource.hasInterface("Scope")) {
        throw new Error(`Cannot define ValaaSpace property '${String(property)
            }' for an object which doesn't implement Scope`);
      } else {
        // Define a Scope property
        let value;
        if (descriptor.hasOwnProperty("value")) {
          // Define a Scope property through a concrete value as Literal or Identifier Expression
          value = expressionFromValue(descriptor.value);
        } else if (typeof descriptor.get !== "undefined") {
          // Define a Scope property through a getter as KueryExpression Expression
          value = expressionFromOperation(descriptor.get);
          if (typeof value === "undefined") {
            throw new Error(`descriptor.get must be either VAKON kuery or a liveable function${
              ""} when defining ValaaSpace property '${String(property)}'`);
          }
        } else {
          throw new Error(`Must specify either descriptor.value or descriptor.get${
              ""} when defining ValaaSpace property '${String(property)}'`);
        }
        const vProperty = vResource._getProperty(property, options);
        if (vProperty) {
          vProperty.setField("value", value, options);
        } else {
          vResource.emplaceAddToField("properties", { name: property, value }, options);
        }
      }
      return vResource;
    } catch (error) {
      throw wrapError(error, `During ${vResource.debugId()}\n .defineProperty(${
              String(property)}), with:`,
          "\n\tresource:", ...dumpObject(vResource),
          "\n\tproperty:", String(property),
          "\n\tdescriptor:", ...dumpObject(descriptor),
      );
    }
  }

  function definePropertyWithBuiltin (builtinType: Object) {
    throw new Error(`Object.defineProperty not implemented for builtin Valaa types (here '${
        builtinType.name}'`);
  }

  function definePropertyWithPrototype (prototype: Object) {
    throw new Error(`Object.defineProperty not implemented for Valaa Resource prototypes (here '${
        prototype.constructor.name}')`);
  }

  function getOwnPropertyDescriptorWithResource (vResource: Vrapper, property: string | Symbol) {
    const options = { transaction: this.__callerValker__ };
    const Type = Valaa[vResource.getTypeName(options)];
    const prototypeEntry = Type.hostObjectPrototype[property];
    if ((typeof prototypeEntry === "object") && (prototypeEntry !== null)
        && prototypeEntry.writableFieldName) {
      const transient = vResource.getTransient(options);
      if (!transient.has(prototypeEntry.writableFieldName)) return undefined;
      return createHostMaterializedFieldDescriptorFromLocal(
          this.__callerValker__, transient.get(prototypeEntry.writableFieldName), prototypeEntry);
    }
    if (!vResource.hasInterface("Scope")) return undefined;
    const vProperty = vResource._getProperty(property, options);
    if (!vProperty || !vProperty.isMaterialized()) return undefined;
    return createHostPropertyDescriptorFromProperty(vProperty, vResource, options);
  }

  function createHostPropertyDescriptorFromProperty (vProperty: Vrapper, vResource: Vrapper,
      options: Object) {
    const valueEntry = vProperty.getTransient(options).get("value");
    if (typeof valueEntry === "undefined") return undefined;
    return createHostPropertyDescriptor(
        vProperty.extractPropertyValue(options, vResource, valueEntry));
  }

  function createHostMaterializedFieldDescriptorFromLocal (valker: any, localValue: any,
      descriptor: any) {
    let removes;
    if (descriptor.sequence) {
      const removesEntry = (typeof localValue === "object") && (localValue !== null)
          && localValue[PartialRemovesTag];
      removes = (removesEntry && valker.tryUnpack(removesEntry)) || [];
    }
    return createHostMaterializedFieldDescriptor(valker.tryUnpack(localValue), descriptor, removes);
  }

  function getOwnPropertyDescriptorWithBuiltin (Type: Object, property: string) {
    if (!Type.hasOwnProperty(property)) return undefined;
    // 'name' value is a string but is not a native field symbol. Skip.
    if ((typeof property === "string") && (property !== "name")) {
      const typeDescriptor = hostObjectDescriptors.get(Type);
      const propertyDescriptor = typeDescriptor && typeDescriptor[property];
      if (propertyDescriptor) return propertyDescriptor;
    }
    return Object.getOwnPropertyDescriptor(Type, property);
  }

  function getOwnPropertyDescriptorWithPrototype (hostObjectPrototype: Object,
      property: string | Symbol) {
    const field = hostObjectPrototype[property];
    return (field && field.isHostField && createHostPrototypeFieldDescriptor(field))
        || (field && createHostFunctionDescriptor(field));
  }

  const toOwnProperties = VALEK.toField("properties")
      .filter(VALEK.toField("ownFields").toField("value").ifDefined({ then: true }));
  function getOwnPropertyDescriptorsWithResource (vResource: Vrapper) {
    const ret = {};
    const options = { transaction: this.__callerValker__ };
    const transient = vResource.getTransient(options);
    if (transient) {
      const Type = Valaa[vResource.getTypeName(options)];
      transient.forEach((fieldValue, fieldName) => {
        const prototypeEntry = Type.hostObjectPrototype[Type[fieldName] || ""];
        if ((typeof prototypeEntry === "object") && (prototypeEntry !== null)
            && prototypeEntry.writableFieldName) {
          ret[fieldValue] = createHostMaterializedFieldDescriptorFromLocal(
              options.transaction, fieldValue, prototypeEntry);
        }
      });
    }
    if (transient.get("properties")) {
      // TODO(iridian): This could be done with one query, but passing extractValue.vExplicitOwner
      // is a bit tricky.
      const properties = vResource.get(toOwnProperties, options);
      for (const vProperty of properties) {
        ret[vProperty.get("name", options)] =
            createHostPropertyDescriptorFromProperty(vProperty, vResource, options);
      }
    }
    return ret;
  }

  function getOwnPropertyDescriptorsWithBuiltin (Type: Object) {
    const ret = {};
    for (const property of Object.getOwnPropertyNames(Type)
        .concat(Object.getOwnPropertySymbols(Type))) {
      ret[property] = getOwnPropertyDescriptorWithBuiltin(Type, property);
    }
    return ret;
  }

  function getOwnPropertyDescriptorsWithPrototype (hostObjectPrototype: Object) {
    const ret = {};
    for (const property of Object.getOwnPropertyNames(hostObjectPrototype)
        .concat(Object.getOwnPropertySymbols(hostObjectPrototype))) {
      ret[property] = getOwnPropertyDescriptorWithPrototype(hostObjectPrototype, property);
    }
    return ret;
  }


  const toOwnPropertyNames = toOwnProperties.map(VALEK.toField("name"));
  function getOwnPropertyNamesWithResource (vResource: Vrapper) {
    if (!vResource.hasInterface("Scope")) return [];
    return vResource.get(toOwnPropertyNames, { transaction: this.__callerValker__ });
  }

  function getOwnPropertyNamesWithBuiltin (Type: Object) {
    // TODO(iridian): Might not work if symbols are polyfilled. Should!
    return Object.getOwnPropertyNames(Type);
  }

  function getOwnPropertyNamesWithPrototype (hostObjectPrototype: Object) {
    // TODO(iridian): Might not work if symbols are polyfilled. Should!
    return Object.getOwnPropertyNames(hostObjectPrototype);
  }


  function getOwnPropertySymbolsWithResource (vResource: Vrapper) {
    const ret = [];
    const options = { transaction: this.__callerValker__ };
    const transient = vResource.getTransient(options);
    if (transient) {
      const Type = Valaa[vResource.getTypeName(options)];
      transient.forEach((fieldValue, fieldName) => {
        let fieldSymbol = Type[fieldName];
        let fieldIntro = fieldSymbol && Type.hostObjectPrototype[fieldSymbol];
        if (!fieldIntro) {
          if (fieldName === "name") {
            fieldSymbol = Type.nameAlias;
          } else if (fieldName === "prototype") {
            fieldSymbol = Type.prototypeAlias;
          }
          fieldIntro = Type.hostObjectPrototype[fieldSymbol];
          if (!fieldIntro) return;
        }
        if (fieldIntro.writableFieldName) ret.push(fieldSymbol);
      });
    }
    return ret;
  }

  function getOwnPropertySymbolsWithBuiltin (type: Object) {
    // TODO(iridian): Might not work if symbols are polyfilled. Should!
    return Object.getOwnPropertySymbols(type);
  }

  function getOwnPropertySymbolsWithPrototype (hostObjectPrototype: Object) {
    // TODO(iridian): Might not work if symbols are polyfilled. Should!
    return Object.getOwnPropertySymbols(hostObjectPrototype);
  }
  return decoratedObject;
}
