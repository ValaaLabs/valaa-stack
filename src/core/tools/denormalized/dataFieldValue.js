import { Iterable } from "immutable";

export default function dataFieldValue (object: Object, fieldName: string) {
  return (Iterable.isIterable(object) || object.constructor.name === "Vrapper")
      ? object.get(fieldName)
      : object[fieldName];
}
