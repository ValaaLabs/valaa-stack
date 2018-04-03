(target, propertyName) => {
  return () => {
    target[propertyName] = "literal value";
  };
};
