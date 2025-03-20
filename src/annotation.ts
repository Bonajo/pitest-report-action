import {MutationStatus, Report} from "./report";

export type AnnotationType = "ALL" | MutationStatus;

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
 * Create Check Runs Annotation for every selected annotation
 * @param report mutation report
 * @param maxAnnotations max number of annotations to process
 * @param annotationType which mutations to include
 * @returns annotation[] annotations that can be used for Checks Run
 */
export function createAnnotations(
        reports: Report[],
        maxAnnotations: number,
        annotationType: AnnotationType): Annotation[] {
    
    let annotations: Annotation[] = []; 
    reports.map(report => 
        report.mutations
            ?.filter(m => annotationType === "ALL" || m.attr_status === annotationType)
            .slice(0, Math.max(maxAnnotations - annotations.length, 0))
            .forEach(m => {
                const annotation: Annotation = {
                    path: m.mutatedClass,
                    start_line: m.lineNumber,
                    end_line: m.lineNumber,
                    annotation_level: m.attr_status === "KILLED" ? "notice" : "warning",
                    message: limitStringSize((!!m.description) ? m.description : m.mutator, 64*1024),
                    raw_details: limitStringSize(JSON.stringify(m, null, 2), 64*1024),
                    title: limitStringSize(`${m.attr_status} -> ${m.mutatedClass}:${m.mutatedMethod}`, 255)
                }
                annotations.push(annotation);
            })
        );
    return annotations;
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