import {isDetected, Mutation, Report} from "./report.js";

export type AnnotationType = "ALL" | "KILLED" | "SURVIVED";
export const ANNOTATION_TYPES: readonly AnnotationType[] = ["ALL", "KILLED", "SURVIVED"];

// Limits as defined by the Check Runs API
export const MAX_TEXT_SIZE = 64 * 1024;
export const MAX_TITLE_SIZE = 255;

/**
 * Annotation as defined by Check Run
 * https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#create-a-check-run
 */
export interface Annotation {
    path: string
    start_line: number
    end_line: number
    start_column?: number
    end_column?: number
    annotation_level: 'notice' | 'warning' | 'failure'
    message: string
    title?: string
    raw_details?: string
}

/**
 * Check if the mutation should be annotated for the annotation type
 * KILLED includes all detected statuses, SURVIVED includes all undetected statuses (e.g. NO_COVERAGE)
 */
function matchesType(mutation: Mutation, annotationType: AnnotationType): boolean {
    switch (annotationType) {
        case "ALL": return true;
        case "KILLED": return isDetected(mutation);
        case "SURVIVED": return !isDetected(mutation);
    }
}

/**
 * Create Check Runs Annotation for every selected annotation
 * @param reports array of reports
 * @param maxAnnotations max number of annotations to process (across all reports)
 * @param annotationType which mutations to include
 * @returns annotation[] annotations that can be used for Checks Run
 */
export function createAnnotations(
        reports: Report[],
        maxAnnotations: number,
        annotationType: AnnotationType): Annotation[] {
    return reports
        .flatMap(report => report.mutations)
        .filter(m => matchesType(m, annotationType))
        .slice(0, Math.max(maxAnnotations, 0))
        .map((m): Annotation => ({
            path: m.mutatedClass,
            start_line: m.lineNumber,
            end_line: m.lineNumber,
            annotation_level: isDetected(m) ? "notice" : "warning",
            message: limitStringSize((!!m.description) ? m.description : m.mutator, MAX_TEXT_SIZE),
            raw_details: limitStringSize(JSON.stringify(m, null, 2), MAX_TEXT_SIZE),
            title: limitStringSize(`${m.attr_status} -> ${m.mutatedClass}:${m.mutatedMethod}`, MAX_TITLE_SIZE)
        }));
}

/**
 * Helper method to cut off text at certain size and add three dots to indicate that there should be more text
 * @param text the text to cut-off
 * @param maxSize max size that the text may be
 * @returns string cut-off at max size
 */
function limitStringSize(text: string, maxSize: number): string {
    return text.length <= maxSize ? text : text.substring(0, maxSize-3) + "...";
}