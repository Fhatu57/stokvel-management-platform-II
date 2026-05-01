/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testMatch: ["**/__tests__/**/*.test.js"],
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  transformIgnorePatterns: ["/node_modules/"],
  collectCoverageFrom: [
  "**/*.js",
  "!node_modules/**",
  "!**/coverage/**",
  "!jest.config.js",
  "!babel.config.js",
  "!frontend-js/**"
]
};