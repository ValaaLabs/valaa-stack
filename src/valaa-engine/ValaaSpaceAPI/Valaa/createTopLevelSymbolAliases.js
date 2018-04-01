export default function createTopLevelSymbolAliases (Valaa: Object, hostNamespaceObject: any) {
  Object.getOwnPropertyNames(hostNamespaceObject).forEach(name => {
    const value = hostNamespaceObject[name];
    if (typeof value === "symbol") {
      if (typeof Valaa[name] === "undefined") {
        Valaa[name] = value;
      } else {
        console.warn(`Cannot create a symbol alias Valaa.${name} to ${
            hostNamespaceObject.name}.${name}`, "with value", String(value),
            `because Valaa.${name} already exists with value:`, Valaa[name]);
      }
    }
  });
}
