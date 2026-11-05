import {Mutation} from "../src/report.js";

/**
 * Path to a file in the fixtures directory, relative to the repository root (the jest cwd)
 */
export function fixture(name: string): string {
    return `__tests__/fixtures/${name}`;
}

/**
 * Create a mutation with sensible defaults, override any field as needed
 */
export function createMutation(overrides: Partial<Mutation> = {}): Mutation {
    return {
        sourceFile: "TestClass.java",
        mutatedClass: "com.example.TestClass",
        mutatedMethod: "testMethod",
        methodDescription: "()V",
        lineNumber: 5,
        mutator: "org.pitest.mutationtest.engine.gregor.mutators.MathMutator",
        indexes: [{index: 1}],
        blocks: [{block: 0}],
        killingTest: "com.example.TestClassTest.[method:test()]",
        description: "testDescription",
        attr_detected: true,
        attr_status: "KILLED",
        attr_numberOfTestsRun: 1,
        ...overrides
    };
}
