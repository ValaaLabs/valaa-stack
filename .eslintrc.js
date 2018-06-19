const shared = require("@valos/toolset-vault/shared/.eslintrc.js");

module.exports = Object.assign({}, shared, {
  // Add overrides here
  rules: {
    ...shared.rules,
    "react/forbid-prop-types": 0,
    "react/sort-comp": 0, // for some reason getters/setters are enabled, which is quite annoying
    "react/jsx-filename-extension": 0, // having a different extension gives little value, toolchain detects the JSX anyway
    "react/jsx-indent": 0, // tired of fighting against how the jsx-indent feels like it knows better
    "react/prefer-stateless-function": 0, // stateless/stateful change can happen: need to restructure is annoying and provides little value

    "jsx-a11y/no-static-element-interactions": 0,
  },
});
