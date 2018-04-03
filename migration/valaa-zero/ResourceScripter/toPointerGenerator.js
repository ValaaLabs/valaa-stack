(target, propertyName) => {
  return () => {
    // Let's point property to its own owner as a placeholder value
    target[propertyName] = target;
  };
};
