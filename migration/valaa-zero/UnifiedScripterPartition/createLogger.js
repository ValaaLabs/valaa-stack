(functionName, logFunction) => {
  return (indent, argumentArray) => {
    const tabs = "* ".repeat(indent || 0);
    const header = tabs + this[Valaa.name] + "::" + functionName + (indent && " -" || "");
    const args = [header].concat(argumentArray);

    if (logFunction === undefined) {
      console.log.apply(null, args);
    }
    else {
      logFunction.apply(null, args);
    }
  };
};