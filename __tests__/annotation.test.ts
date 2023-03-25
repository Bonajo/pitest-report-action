import {expect, test} from "@jest/globals";
import {createAnnotations} from "../src/annotation";
import { Report } from "../src/report";
// @ts-ignore
import testData from './testData.json';

const report = <Report>testData;

test('createAnnotations for ALL', async () => {
    const annotations = createAnnotations(report, 50, "ALL");
    expect(annotations.length).toBe(11);
});

test('createAnnotations for SURVIVED', async () => {
    const annotations = createAnnotations(report, 50, "SURVIVED");
    expect(annotations.length).toBe(1);
});

test('createAnnotations for KILLED', async () => {
    const annotations = createAnnotations(report, 50, "KILLED");
    expect(annotations.length).toBe(10);
});

test('createAnnotations should limit annotations to maxAnnotations', async () => {
    const annotations = createAnnotations(report, 5, "ALL");
    expect(annotations.length).toBe(5);
});

test('createAnnotations should return valid annotations', async () => {
    // Should be valid according to: https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#create-a-check-run

    // Make a copy of the report
    const longTitleReport: Report = JSON.parse(JSON.stringify(report));
    // Set a long string as sourceFile, as this is used as part of the title of the annotation
    longTitleReport.mutations.mutation[0].mutatedClass = "test".repeat(70);
    const annotations = createAnnotations(longTitleReport, 1, "ALL");
    expect(annotations[0].title?.length).toBe(255);
});