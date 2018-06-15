module.exports = {
  collectCoverage: false,
  coveragePathIgnorePatterns: [
    ".*/node_modules",
    ".*/valma",
    ".*/valma.bin",
    ".*/test"
  ],
  verbose: true,
  testRegex: "packages.*\\.test\\.js$",
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/node_modules/@valos/valma-toolset-vault/jest/styleMock.js"
  },
  setupFiles: [
    "<rootDir>/node_modules/@valos/valma-toolset-vault/jest/init.js"
  ],
  transform: {
    ".*": "<rootDir>/node_modules/babel-jest"
  }
};
