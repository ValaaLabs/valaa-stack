// @flow

import { dumpKuery, dumpObject, Valker } from "~/valaa-core/VALK";
import coreBuiltinSteppers, {
  tryLiteral, tryFullLiteral, tryUnpackLiteral, isHostHead, resolveTypeof, BuiltinStep,
} from "~/valaa-core/VALK/builtinSteppers";

import { createNativeIdentifier, isNativeIdentifier, getNativeIdentifierValue,
  setNativeIdentifierValue,
} from "~/valaa-script/denormalized/nativeIdentifier";

export default Object.freeze({
  ...coreBuiltinSteppers,
  // valaa-script property builtin steppers
  "§let$$": function _createLetIdentifier (valker: Valker, head: any, scope: ?Object,
      [, value]: Object) {
    return createNativeIdentifier(
        (typeof value !== "object" ? value : tryUnpackLiteral(valker, head, value, scope)));
  },
  "§const$$": function _createConstIdentifier (valker: Valker, head: any, scope: ?Object,
      [, value]: Object) {
    return Object.freeze(createNativeIdentifier(
        (typeof value !== "object" ? value : tryUnpackLiteral(valker, head, value, scope))));
  },
  "§$$": function identifierValue (valker: Valker, head: any, scope: ?Object,
      getIdentifierOp: any): any {
    return getIdentifierOrPropertyValue(valker, head, scope, getIdentifierOp, false);
  },
  "§..": function propertyValue (valker: Valker, head: any, scope: ?Object, getPropertyOp: any) {
    return getIdentifierOrPropertyValue(valker, head, scope, getPropertyOp, true);
  },
  "§$$<-": function alterIdentifier (valker: Valker, head: any, scope: ?Object,
      alterIdentifierOp: any) {
    return alterIdentifierOrProperty(valker, head, scope, alterIdentifierOp, false);
  },
  "§..<-": function alterProperty (valker: Valker, head: any, scope: ?Object,
      alterPropertyOp: any) {
    return alterIdentifierOrProperty(valker, head, scope, alterPropertyOp, true);
  },
  "§delete$$": function deleteIdentifier (valker: Valker, head: any, scope: ?Object,
      deletePropertyOp: any) {
    return deleteIdentifierOrProperty(valker, head, scope, deletePropertyOp, false);
  },
  "§delete..": function deleteProperty (valker: Valker, head: any, scope: ?Object,
      deletePropertyOp: any) {
    return deleteIdentifierOrProperty(valker, head, scope, deletePropertyOp, true);
  },
  "§new": function new_ (valker: Valker, head: any, scope: ?Object,
      newOp: any) {
    // FIXME(iridian): The implementation of this function is tightly coupled with scriptAPI.js,
    // is thus an extension and should be located with VALEK.
    let Type;
    try {
      const eType = valker.advance(head, newOp[1], scope);
      const eArgs = new Array(newOp.length - 2);
      for (let index = 0; index + 2 !== newOp.length; ++index) {
        const arg = newOp[index + 2];
        eArgs[index] = tryUnpackLiteral(valker, head, arg, scope);
      }
      Type = valker.tryUnpack(eType);
      if (typeof Type === "function") return valker.pack(new Type(...eArgs));
      if ((typeof Type === "object") && BuiltinTypePrototype.isPrototypeOf(Type)) {
        return valker.pack(Type[".new"](valker, scope, ...eArgs));
      }
      if (isHostHead(eType)) {
        const PrototypeType = scope.Valaa[Type.getTypeName({ transaction: valker })];
        return valker.pack(PrototypeType[".instantiate"](valker, scope, Type, ...eArgs));
      }
      throw new Error(`'new': cannot create object of type '${typeof Type
          }', expected either a function for native object construction, a Valaa type for${
          ""} Valaa object creation or a Valaa Resource for instantiation`);
    } catch (error) {
      throw valker.wrapErrorEvent(error, `builtin.§new`,
          "\n\tType:", ...dumpObject(Type));
    }
  },
  "§typeof": function typeof_ (valker: Valker, head: any, scope: ?Object,
      typeofStep: BuiltinStep) {
    const object = typeofStep[1];
    const packedObject = typeof object !== "object" ? object
    // typeof must not fail on a missing global identifier, even if plain identifier access fails.
        : (Array.isArray(object) && (object[0] === "§$$"))
            ? getIdentifierOrPropertyValue(valker, head, scope, object, false, true)
        : tryLiteral(valker, head, object, scope);
    return resolveTypeof(valker, head, scope, typeofStep, packedObject);
  },
  "§while": function while_ (valker: Valker, head: any, scope: ?Object,
      [, toTest, toStep = null]: any) {
    if (typeof toStep !== "object" || (toStep === null)) {
      while (typeof toTest !== "object" ? toTest : valker.advance(head, toTest, scope));
      return head;
    }
    let stepHead = head;
    if ((typeof toTest !== "object") || (toTest === null)) {
      while (toTest) {
        stepHead = valker.advance(stepHead, toStep, scope);
      }
    } else {
      while (valker.advance(stepHead, toTest, scope)) {
        stepHead = valker.advance(stepHead, toStep, scope);
      }
    }
    return stepHead;
  },
});

export const ValaaPrimitive = Symbol("Valaa Primitive");
export const BuiltinTypePrototype = { [ValaaPrimitive]: true };

const propertyValueMethodStep = ["§method", "propertyValue"];

function getIdentifierOrPropertyValue (valker: Valker, head: any, scope: ?Object,
      [, propertyName, container]: any, isGetProperty: ?boolean,
      allowUndefinedIdentifier: ?boolean): any {
  let eContainer: Object;
  let ePropertyName: string | Symbol;
  try {
    eContainer = (typeof container === "undefined")
        ? (isGetProperty ? head : scope)
        : tryFullLiteral(valker, head, container, scope);
    ePropertyName = (typeof propertyName !== "object") ? propertyName
        : tryLiteral(valker, head, propertyName, scope);
    if (eContainer._sequence) {
      eContainer = valker.tryUnpack(eContainer);
    } else if (isHostHead(eContainer)) {
      return valker.tryPack(valker._builtinSteppers["§method"](
          valker, eContainer, scope, propertyValueMethodStep)(ePropertyName));
    }
    const property = eContainer[ePropertyName];
    if (isGetProperty) return valker.tryPack(property);
    if ((typeof property === "undefined") && !allowUndefinedIdentifier
        && !(ePropertyName in eContainer)) {
      throw new Error(`Cannot find identifier '${ePropertyName}' in scope`);
    }
    if ((typeof property !== "object") || (property === null)) return property;
    const ret = isNativeIdentifier(property) ? getNativeIdentifierValue(property)
        // FIXME(iridian): Leaking abstractions like there's no tomorrow. This (among many other
        // parts of this file) belong to the valaa-engine builtinSteppers-extension, which
        // doesn't exist, which is the reason these are not there.
        : (property._typeName === "Property") && isHostHead(valker.tryPack(property))
            ? property.extractValue({ transaction: valker }, eContainer.this)
            : property;
    return valker.tryPack(ret);
  } catch (error) {
    let actualError = error;
    if (!error.originalError) {
      if ((eContainer === null)
          || ((typeof eContainer !== "object") && (typeof eContainer !== "function")
              && (typeof eContainer !== "string"))) {
        actualError = new Error(`Cannot access ${isGetProperty ? "property" : "identifier"} '${
            String(ePropertyName)}' from ${isGetProperty ? "non-object-like" : "non-scope"
            } value '${String(eContainer)}'`);
      } else if ((typeof ePropertyName !== "string") && (typeof ePropertyName !== "symbol")) {
        actualError = new Error(`Cannot use a value with type '${typeof ePropertyName}' as ${
            isGetProperty ? "property" : "identifier"} name`);
      }
    }
    throw valker.wrapErrorEvent(actualError, isGetProperty ? "getProperty" : "getIdentifier",
        "\n\thead:", ...dumpObject(head),
        "\n\tcontainer:", ...dumpObject(eContainer),
        "(via kuery:", ...dumpKuery(container), ")",
        "\n\tpropertyName:", ...dumpObject(ePropertyName),
        "(via kuery:", ...dumpKuery(propertyName), ")",
    );
  }
}

const alterPropertyMethodStep = ["§method", "alterProperty"];

function alterIdentifierOrProperty (valker: Valker, head: any, scope: ?Object,
      [, propertyName, alterationVAKON, container]: any, isAlterProperty: ?boolean) {
  let eContainer: Object;
  let ePropertyName;
  let eAlterationVAKON;
  try {
    eContainer = (typeof container === "undefined")
        ? (isAlterProperty ? head : scope)
        : tryFullLiteral(valker, head, container, scope);
    ePropertyName = typeof propertyName !== "object" ? propertyName
        : tryLiteral(valker, head, propertyName, scope);
    eAlterationVAKON = typeof alterationVAKON !== "object" ? alterationVAKON
        : tryLiteral(valker, head, alterationVAKON, scope);
    if (isHostHead(eContainer)) {
      if (!eContainer._sequence) {
        return valker.tryPack(valker._builtinSteppers["§method"](
            valker, eContainer, scope, alterPropertyMethodStep)(ePropertyName, eAlterationVAKON));
      }
      // TODO(iridian): Implement host sequence entry manipulation.
      throw new Error(`Modifying host sequence entries via index assignment not implemented yet`);
    }
    const property = eContainer[ePropertyName];
    if (isAlterProperty) {
      const packedNewValue = valker.advance(valker.pack(property), eAlterationVAKON, scope);
      eContainer[ePropertyName] = valker.tryUnpack(packedNewValue);
      return packedNewValue;
    }
    if ((typeof property === "object") && (property !== null)) {
      if (isNativeIdentifier(property)) {
        const packedNewValue = valker.advance(
            valker.tryPack(getNativeIdentifierValue(property)), eAlterationVAKON, scope);
        setNativeIdentifierValue(property, valker.tryUnpack(packedNewValue));
        return packedNewValue;
      }
      if ((typeof property.alterValue === "function") && isHostHead(valker.tryPack(property))) {
        return valker.tryPack(
            property.alterValue(eAlterationVAKON, { transaction: valker }, eContainer.this));
      }
    }
    throw new Error(`Cannot modify read only or non-existent scope identifier '${
        ePropertyName}' (with current value '${property}')`);
  } catch (error) {
    let actualError = error;
    // These are here as a performance optimization. The invariantifications are not cheap
    // and can be performed as a reaction to javascript native exception thrown on
    // eContainer[ePropertyName] line
    if (!error.originalError) {
      if ((typeof eContainer !== "object") || (eContainer === null)) {
        actualError = new Error(`Cannot modify ${isAlterProperty ? "property" : "identifier"} '${
            String(ePropertyName)}' of ${
            isAlterProperty ? "non-object" : "non-scope"} value '${String(eContainer)}'`);
      } else if ((typeof ePropertyName !== "string") && (typeof ePropertyName !== "symbol")) {
        actualError = new Error(`Cannot use a value with type '${typeof ePropertyName}' as ${
            isAlterProperty ? "property" : "identifier"} name when modifying`);
      }
    }
    /*
    invariantifyObject(eAlterationVAKON, "alterProperty.alterationVAKON after valking", {},
        "\n\talterationVAKON:", ...dumpKuery(alterationVAKON),
        "\n\talterationVAKON run:", eAlterationVAKON);
    */
    throw valker.wrapErrorEvent(actualError, isAlterProperty ? "alterProperty" : "alterIdentifier",
        "\n\thead:", ...dumpObject(head),
        "\n\tcontainer:", ...dumpObject(eContainer),
        "(via kuery:", ...dumpKuery(container), ")",
        "\n\tpropertyName:", ...dumpObject(ePropertyName),
        "(via kuery:", ...dumpKuery(propertyName), ")",
        "\n\talterationVAKON:", ...dumpObject(eAlterationVAKON),
        "(via kuery:", ...dumpKuery(alterationVAKON), ")",
    );
  }
}

const deletePropertyMethodStep = ["§method", "deleteProperty"];

function deleteIdentifierOrProperty (valker: Valker, head: any, scope: ?Object,
      [, propertyName, container]: any, isPropertyNotIdentifier: ?boolean) {
  let eContainer: Object;
  let ePropertyName;
  try {
    eContainer = (typeof container === "undefined")
        ? (isPropertyNotIdentifier ? head : scope)
        : tryFullLiteral(valker, head, container, scope);
    ePropertyName = typeof propertyName !== "object" ? propertyName
        : tryLiteral(valker, head, propertyName, scope);
    if (isHostHead(eContainer)) {
      if (eContainer._sequence) {
        // TODO(iridian): Implement host sequence entry manipulation.
        throw new Error(`Deleting host sequence entries via index not implemented yet`);
      }
      return valker._builtinSteppers["§method"](
          valker, eContainer, scope, deletePropertyMethodStep)(ePropertyName);
    }
    if (isPropertyNotIdentifier) {
      if (delete eContainer[ePropertyName]) return true;
      throw new SyntaxError(`Cannot delete non-configurable property '${ePropertyName}'`);
    }
    const property = eContainer[ePropertyName];
    if ((typeof property === "object") && (property !== null)) {
      if (isNativeIdentifier(property)) {
        throw new SyntaxError(
            `Cannot delete regular variable '${String(ePropertyName)}' from scope`);
      }
      if ((typeof property.deleteValue === "function") && isHostHead(valker.tryPack(property))) {
        property.destroy({ transaction: valker });
        return true;
      }
    }
    throw new SyntaxError(`Cannot delete non-existent (or immutable) identifier '${ePropertyName
        }' from scope`);
  } catch (error) {
    let actualError = error;
    if (!error.originalError) {
      if ((typeof eContainer !== "object") || (eContainer === null)) {
        actualError = new Error(`Cannot delete ${
                isPropertyNotIdentifier ? "property" : "identifier"} '${
            String(ePropertyName)}' of ${
            isPropertyNotIdentifier ? "non-object" : "non-scope"} value '${String(eContainer)}'`);
      } else if ((typeof ePropertyName !== "string") && (typeof ePropertyName !== "symbol")) {
        actualError = new Error(`Cannot use a value with type '${typeof ePropertyName}' as ${
            isPropertyNotIdentifier ? "property" : "identifier"} name when deleting`);
      }
    }
    throw valker.wrapErrorEvent(actualError,
        isPropertyNotIdentifier ? "deleteProperty" : "deleteIdentifier",
        "\n\thead:", ...dumpObject(head),
        "\n\tcontainer:", ...dumpObject(eContainer),
        "(via kuery:", ...dumpKuery(container), ")",
        "\n\tpropertyName:", ...dumpObject(ePropertyName),
        "(via kuery:", ...dumpKuery(propertyName), ")",
    );
  }
}
