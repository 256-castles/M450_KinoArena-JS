// M450 LB1 / Teil 3: Mutationstest ueber die Units aus Teil 1, 2 und 4.
// Ausfuehren mit: npm run test:mutation:lb1
// Bericht: reports/mutation/lb1/index.html
// break: 100 laesst den Lauf fehlschlagen, sobald ein Mutant ueberlebt.
import base from "./stryker.config.mjs";

/** @type {import("@stryker-mutator/api/core").PartialStrykerOptions} */
export default {
    ...base,
    mutate: [
        "server/src/domain/loginThrottle.js",
        "server/src/services/bookingService.js",
        "server/src/services/statsService.js"
    ],
    htmlReporter: { fileName: "reports/mutation/lb1/index.html" },
    thresholds: { high: 100, low: 100, break: 100 }
};
