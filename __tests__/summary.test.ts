import {expect, test} from "@jest/globals";
import {Summary} from "../src/summary";
import {Mutation, MutationStatus} from "../src/report";

function createMutation(status: MutationStatus, mutatedClass: string = "class.TestClass"): Mutation {
    return {
        attr_status: status,
        mutatedClass: mutatedClass,
        mutatedMethod: "testMethod",
        mutator: "testMutator",
        killingTest: "testTest",
        sourceFile: "testClass",
        lineNumber: 5,
        description: "testDescription",
        attr_detected: true,
        blocks: [],
        attr_numberOfTestsRun: 1,
        indexes: [],
        methodDescription: "testMethod"
    };
}

test('summary should default to 0',  () => {
    const summary = new Summary();
    expect(summary.survived).toBe(0);
    expect(summary.killed).toBe(0);
});

test('process should increase',  () => {
    const summary = new Summary();
    summary.process(createMutation("KILLED"));
    expect(summary.survived).toBe(0);
    expect(summary.killed).toBe(1);
});

test('process should increase', () => {
    const summary = new Summary();
    summary.process(createMutation("SURVIVED"));
    expect(summary.survived).toBe(1);
    expect(summary.killed).toBe(0);
});

test('toSummaryTable should have every class as a row', () => {
    const summary = new Summary();
    summary.process(createMutation("SURVIVED"));
    summary.process(createMutation("KILLED", "someother.TestClass"));
    expect(summary.toSummaryTable().length).toBe(4);
});

test('toSummaryMarkdown', () => {
    const summary = new Summary();
    summary.process(createMutation("SURVIVED"));
    summary.process(createMutation("KILLED", "someother.TestClass"));
    const markdown = summary.toSummaryMarkdown();
    const lastRow = markdown.split("\n").pop();
    expect(lastRow).toBe('| Total | 2 | 1 | 1 |');
});

test('strength', () => {
    const summary = new Summary();
    summary.process(createMutation("SURVIVED"));
    summary.process(createMutation("KILLED", "someother.TestClass"));
    summary.process(undefined);
    expect(summary.strength).toBe(50);
});