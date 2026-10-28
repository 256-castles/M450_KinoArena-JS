// Mutationstests mit Stryker (https://stryker-mutator.io)
// Ausfuehren mit: npm run test:mutation
// Bericht: reports/mutation/index.html
/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.js" },
  coverageAnalysis: "perTest",

  // Mutiert wird der Anwendungscode, nicht Migrationen, Seeds oder Startdateien.
  // Fuer schnelle Laeufe einzelne Dateien waehlen, z. B.:
  //   npx stryker run --mutate server/src/domain/validation.js
  mutate: [
    "server/src/**/*.js",
    "client/src/**/*.{js,jsx}",
    "!**/*.test.{js,jsx}",
    "!server/src/db/**",
    "!server/src/server.js",
    "!client/src/main.jsx"
  ],
  ignorePatterns: ["client/dist", "coverage", "reports", "tmp"],

  reporters: ["html", "clear-text", "progress"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  thresholds: { high: 80, low: 60, break: null },
  tempDirName: ".stryker-tmp"
};
