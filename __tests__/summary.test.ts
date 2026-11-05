import {describe, expect, test} from "@jest/globals";
import {Summary} from "../src/summary.js";
import {MutationStatus} from "../src/report.js";
import {createMutation} from "./helpers.js";

function summaryOf(...statuses: MutationStatus[]): Summary {
    return statuses
        .map(status => createMutation({attr_status: status}))
        .reduce((summary, mutation) => summary.process(mutation), new Summary());
}

function counts(summary: Summary) {
    return {
        killed: summary.killed,
        survived: summary.survived,
        noCoverage: summary.noCoverage,
        total: summary.total
    };
}

describe('counting', () => {
    test('an empty summary is all zeros', () => {
        const summary = new Summary();
        expect(counts(summary)).toEqual({killed: 0, survived: 0, noCoverage: 0, total: 0});
        expect(summary.strength).toBe(0);
    });

    test.each([
        ["KILLED", {killed: 1, survived: 0, noCoverage: 0}],
        ["TIMED_OUT", {killed: 1, survived: 0, noCoverage: 0}],
        ["MEMORY_ERROR", {killed: 1, survived: 0, noCoverage: 0}],
        ["RUN_ERROR", {killed: 1, survived: 0, noCoverage: 0}],
        ["NON_VIABLE", {killed: 1, survived: 0, noCoverage: 0}],
        ["SURVIVED", {killed: 0, survived: 1, noCoverage: 0}],
        ["NOT_STARTED", {killed: 0, survived: 1, noCoverage: 0}],
        ["STARTED", {killed: 0, survived: 1, noCoverage: 0}],
        ["NO_COVERAGE", {killed: 0, survived: 0, noCoverage: 1}]
    ])('%s is counted as %o', (status, expected) => {
        expect(counts(summaryOf(status as MutationStatus))).toEqual({...expected, total: 1});
    });

    test('process returns the summary for chaining', () => {
        const summary = new Summary();
        expect(summary.process(createMutation())).toBe(summary);
    });
});

describe('strength', () => {
    test.each<[MutationStatus[], number]>([
        [["KILLED", "KILLED"], 100],
        [["SURVIVED"], 0],
        [["KILLED", "SURVIVED"], 50],
        [["TIMED_OUT", "SURVIVED"], 50],
        // mutations without coverage are excluded, like pitest's test strength
        [["KILLED", "SURVIVED", "NO_COVERAGE"], 50],
        [["NO_COVERAGE"], 0]
    ])('of %p is %d', (statuses, expected) => {
        expect(summaryOf(...statuses).strength).toBe(expected);
    });

    test('is not rounded', () => {
        expect(summaryOf("KILLED", "SURVIVED", "SURVIVED").strength).toBeCloseTo(33.333, 3);
    });
});

describe('tables', () => {
    function exampleSummary(): Summary {
        return new Summary()
            .process(createMutation({attr_status: "KILLED", mutatedClass: "com.example.A"}))
            .process(createMutation({attr_status: "SURVIVED", mutatedClass: "com.example.A"}))
            .process(createMutation({attr_status: "NO_COVERAGE", mutatedClass: "com.example.B"}));
    }

    test('toSummaryTable has a header, a row per class and a total', () => {
        expect(exampleSummary().toSummaryTable()).toEqual([
            [
                {data: 'Class', header: true},
                {data: 'Mutations', header: true},
                {data: 'KILLED', header: true},
                {data: 'SURVIVED', header: true},
                {data: 'NO_COVERAGE', header: true}
            ],
            ["com.example.A", "2", "1", "1", "0"],
            ["com.example.B", "1", "0", "0", "1"],
            ["Total", "3", "1", "1", "1"]
        ]);
    });

    test('toSummaryMarkdown has a header, a row per class and a total', () => {
        expect(exampleSummary().toSummaryMarkdown()).toBe([
            '| Class | Mutations | KILLED | SURVIVED | NO_COVERAGE |',
            '| --- | --- | --- | --- | --- |',
            '| com.example.A | 2 | 1 | 1 | 0 |',
            '| com.example.B | 1 | 0 | 0 | 1 |',
            '| Total | 3 | 1 | 1 | 1 |'
        ].join("\n"));
    });

    test('an empty summary only has the header and total', () => {
        expect(new Summary().toSummaryMarkdown().split("\n")).toEqual([
            '| Class | Mutations | KILLED | SURVIVED | NO_COVERAGE |',
            '| --- | --- | --- | --- | --- |',
            '| Total | 0 | 0 | 0 | 0 |'
        ]);
    });
});
