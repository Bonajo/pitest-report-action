import {describe, expect, jest, test} from "@jest/globals";
import {AnnotationType, createAnnotations, MAX_TEXT_SIZE, MAX_TITLE_SIZE} from "../src/annotation.js";
import {Mutation, MutationStatus, Report} from "../src/report.js";
import {createMutation} from "./helpers.js";
// @ts-ignore
import mutationData from './fixtures/mutationData.json' with { type: 'json' };

function report(mutations: Mutation[], path: string = "mutations.xml"): Report {
    return new Report("XML", path, mutations);
}

// Fresh copy for every test, so tests can't influence each other through shared data
function realReport(): Report {
    return report(structuredClone(mutationData) as Mutation[]);
}

describe('filtering', () => {
    test.each([
        ["ALL", 11],
        ["SURVIVED", 1],
        ["KILLED", 10]
    ])('%s annotates %i mutations of the example report', (type, expected) => {
        expect(createAnnotations([realReport()], 50, type as AnnotationType)).toHaveLength(expected);
    });

    test.each([
        ["KILLED", true],
        ["TIMED_OUT", true],
        ["MEMORY_ERROR", true],
        ["RUN_ERROR", true],
        ["NON_VIABLE", true],
        ["SURVIVED", false],
        ["NO_COVERAGE", false],
        ["NOT_STARTED", false],
        ["STARTED", false]
    ])('%s counts as detected: %s', (status, detected) => {
        const reports = [report([createMutation({attr_status: status as MutationStatus})])];

        expect(createAnnotations(reports, 50, "ALL")).toHaveLength(1);
        expect(createAnnotations(reports, 50, "KILLED")).toHaveLength(detected ? 1 : 0);
        expect(createAnnotations(reports, 50, "SURVIVED")).toHaveLength(detected ? 0 : 1);
        expect(createAnnotations(reports, 50, "ALL")[0].annotation_level).toBe(detected ? "notice" : "warning");
    });
});

describe('limit', () => {
    test('limits the number of annotations to maxAnnotations', () => {
        expect(createAnnotations([realReport()], 5, "ALL")).toHaveLength(5);
    });

    test('the limit applies across all reports, in order', () => {
        const first = report([1, 2, 3].map(lineNumber => createMutation({lineNumber})), "first.xml");
        const second = report([4, 5, 6].map(lineNumber => createMutation({lineNumber})), "second.xml");

        const annotations = createAnnotations([first, second], 4, "ALL");

        expect(annotations.map(a => a.start_line)).toEqual([1, 2, 3, 4]);
    });

    test('maxAnnotations of 0 returns no annotations', () => {
        expect(createAnnotations([realReport()], 0, "ALL")).toEqual([]);
    });

    test('a report without mutations returns no annotations', () => {
        expect(createAnnotations([report([])], 5, "ALL")).toEqual([]);
    });
});

describe('content', () => {
    test('maps a mutation to an annotation', () => {
        const mutation = createMutation({attr_status: "SURVIVED", lineNumber: 12, description: "removed call"});

        const [annotation] = createAnnotations([report([mutation])], 1, "ALL");

        expect(annotation).toEqual({
            path: "com.example.TestClass",
            start_line: 12,
            end_line: 12,
            annotation_level: "warning",
            message: "removed call",
            title: "SURVIVED -> com.example.TestClass:testMethod",
            raw_details: JSON.stringify(mutation, null, 2)
        });
    });

    test('uses the path of the source file when it is resolved', () => {
        const mutation = createMutation();
        const reports = [report([mutation], "module/target/pit-reports/mutations.xml")];
        const resolvePath = jest.fn((_mutation: Mutation, _report: Report): string | undefined => "src/main/java/com/example/TestClass.java");

        const [annotation] = createAnnotations(reports, 1, "ALL", resolvePath);

        expect(annotation.path).toBe("src/main/java/com/example/TestClass.java");
        expect(resolvePath).toHaveBeenCalledWith(mutation, reports[0]);
    });

    test('falls back to the class name when the source file is not resolved', () => {
        const [annotation] = createAnnotations([report([createMutation()])], 1, "ALL", () => undefined);

        expect(annotation.path).toBe("com.example.TestClass");
    });

    test('only resolves the paths of the annotations that are created', () => {
        const resolvePath = jest.fn((_mutation: Mutation, _report: Report): string | undefined => undefined);

        createAnnotations([realReport()], 2, "ALL", resolvePath);

        expect(resolvePath).toHaveBeenCalledTimes(2);
    });

    test.each([undefined, ""])('message falls back to the mutator when description is %p', (description) => {
        const [annotation] = createAnnotations([report([createMutation({description})])], 1, "ALL");

        expect(annotation.message).toBe("org.pitest.mutationtest.engine.gregor.mutators.MathMutator");
    });

    // "KILLED -> " + mutatedClass + ":testMethod" is 21 characters plus the class name
    test('a title of exactly the max size is not truncated', () => {
        const mutatedClass = "c".repeat(MAX_TITLE_SIZE - 21);
        const [annotation] = createAnnotations([report([createMutation({mutatedClass})])], 1, "ALL");

        expect(annotation.title).toBe(`KILLED -> ${mutatedClass}:testMethod`);
        expect(annotation.title).toHaveLength(MAX_TITLE_SIZE);
    });

    test('a title longer than the max size is truncated', () => {
        const mutatedClass = "c".repeat(MAX_TITLE_SIZE - 20);
        const [annotation] = createAnnotations([report([createMutation({mutatedClass})])], 1, "ALL");

        expect(annotation.title).toHaveLength(MAX_TITLE_SIZE);
        expect(annotation.title?.endsWith("...")).toBe(true);
    });

    test('message and raw details are truncated to the max size', () => {
        const description = "d".repeat(MAX_TEXT_SIZE + 1);
        const [annotation] = createAnnotations([report([createMutation({description})])], 1, "ALL");

        expect(annotation.message).toBe("d".repeat(MAX_TEXT_SIZE - 3) + "...");
        expect(annotation.raw_details).toHaveLength(MAX_TEXT_SIZE);
        expect(annotation.raw_details?.endsWith("...")).toBe(true);
    });

    test('a message of exactly the max size is not truncated', () => {
        const description = "d".repeat(MAX_TEXT_SIZE);
        const [annotation] = createAnnotations([report([createMutation({description})])], 1, "ALL");

        expect(annotation.message).toBe(description);
    });
});
