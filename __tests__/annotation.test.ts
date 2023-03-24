import {expect, test} from "@jest/globals";
import {createAnnotations} from "../src/annotation";
import { Report } from "../src/report";
// @ts-ignore
import testData from './testData.json';

const report = <Report>testData;

test('createAnnotations for ALL', async () => {
    const annotations = createAnnotations(report, 50, "ALL", "somedir");
    expect(annotations.length).toBe(11);
});

test('createAnnotations for SURVIVED', async () => {
    const annotations = createAnnotations(report, 50, "SURVIVED", "somedir");
    expect(annotations.length).toBe(1);
});

test('createAnnotations for KILLED', async () => {
    const annotations = createAnnotations(report, 50, "KILLED", "somedir");
    expect(annotations.length).toBe(10);
});

test('createAnnotations should limit annotations to maxAnnotations', async () => {
    const annotations = createAnnotations(report, 5, "ALL", "somedir");
    expect(annotations.length).toBe(5);
});

test('createAnnotations should set correct base path', async () => {
    const annotations = createAnnotations(report, 1, "ALL", "somedir");
    expect(annotations[0].path.startsWith("somedir")).toBeTruthy();
});

test('createAnnotations should return valid annotations', async () => {
    // Should be valid according to: https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#create-a-check-run

    // Make a copy of the report
    const longTitleReport: Report = JSON.parse(JSON.stringify(report));
    // Set a long string as sourceFile, as this is used as part of the title of the annotation
    longTitleReport.mutations.mutation[0].sourceFile = "test".repeat(70);
    console.log(longTitleReport.mutations.mutation[0])
    const annotations = createAnnotations(longTitleReport, 1, "ALL", "somedir");
    expect(annotations[0].title?.length).toBe(255);
});