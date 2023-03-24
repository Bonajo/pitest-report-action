import {MutationStatus, Report} from "./report";

export type AnnotationType = "ALL" | MutationStatus;

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

export function createAnnotations(
        report: Report,
        maxAnnotations: number,
        annotationType: AnnotationType,
        basePath: string): Annotation[] {
    return report.mutations.mutation
        .filter(m => annotationType === "ALL" || m.attr_status === annotationType)
        .slice(0, maxAnnotations)
        .map(m => {
            const annotation: Annotation = {
                path: `${basePath}/${m.mutatedClass.replace(/\./g, "/")}.java`,
                start_line: m.lineNumber,
                end_line: m.lineNumber,
                annotation_level: m.attr_status === "KILLED" ? "notice" : "warning",
                message: limitStringSize(`${m.attr_status} -> ${m.description}`, 64*1024),
                raw_details: limitStringSize(`Mutator: ${m.mutator}\nKilling test: ${m.killingTest}`, 64*1024),
                title: limitStringSize(`${m.attr_status} -> ${m.sourceFile}.${m.mutatedMethod}`, 255)
            }
            return annotation;
        });
}

function limitStringSize(text: string, maxSize: number): string {
    return text.length <= maxSize ? text : text.substring(0, maxSize-3) + "...";
}