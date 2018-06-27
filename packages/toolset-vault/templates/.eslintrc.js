const shared = require("@valos/toolset-vault/shared/.eslintrc");

module.exports = Object.assign({}, shared, {
  // Add overrides here.
  // Stick to es5: current version of eslint doesn't seem to support all of es6.
});
