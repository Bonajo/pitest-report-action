"use strict";
/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,
    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,
    // An array of glob patterns indicating a set of files for which coverage information should be collected
    // collectCoverageFrom: undefined,
    // The directory where Jest should output its coverage files
    coverageDirectory: "coverage",
    // An array of regexp pattern strings used to skip coverage collection
    coveragePathIgnorePatterns: [
        "/node_modules/",
        "/dist/",
        "src/main.ts"
    ],
    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: "v8",
    // A list of reporter names that Jest uses when writing coverage reports
    coverageReporters: [
        "lcov"
    ],
    // An object that configures minimum threshold enforcement for coverage results
    // coverageThreshold: undefined,
    // A path to a custom dependency extractor
    // dependencyExtractor: undefined,
    // Make calling deprecated APIs throw helpful error messages
    errorOnDeprecated: true,
    // An array of file extensions your modules use
    moduleFileExtensions: [
        "js",
        "ts"
    ],
    // The glob patterns Jest uses to detect test files
    testMatch: [
        "**/__tests__/**/*.test.ts",
    ],
    // A map from regular expressions to paths to transformers
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    // Indicates whether each individual test should be reported during the run
    verbose: true,
};
