export const NativeIdentifierTag = Symbol("NativeIdentifier");

export function createNativeIdentifier (value: any) {
  return { [NativeIdentifierTag]: value };
}

export function isNativeIdentifier (candidate: Object) {
  return (typeof candidate === "object") && (candidate !== null)
      && candidate.hasOwnProperty(NativeIdentifierTag);
}

export function getNativeIdentifierValue (nativeIdentifier: Object) {
  return nativeIdentifier[NativeIdentifierTag];
}

export function setNativeIdentifierValue (nativeIdentifier: Object, value: any) {
  nativeIdentifier[NativeIdentifierTag] = value;
}
