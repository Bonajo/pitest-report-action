"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnnotations = void 0;
/**
 * Create Check Runs Annotation for every selected annotation
 * @param report mutation report
 * @param maxAnnotations max number of annotations to process
 * @param annotationType which mutations to include
 * @returns annotation[] annotations that can be used for Checks Run
 */
function createAnnotations(reports, maxAnnotations, annotationType) {
    let annotations = [];
    reports.map(report => {
        var _a;
        return (_a = report.mutations) === null || _a === void 0 ? void 0 : _a.filter(m => annotationType === "ALL" || m.attr_status === annotationType).slice(0, Math.max(maxAnnotations - annotations.length, 0)).forEach(m => {
            const annotation = {
                path: m.mutatedClass,
                start_line: m.lineNumber,
                end_line: m.lineNumber,
                annotation_level: m.attr_status === "KILLED" ? "notice" : "warning",
                message: limitStringSize((!!m.description) ? m.description : m.mutator, 64 * 1024),
                raw_details: limitStringSize(JSON.stringify(m, null, 2), 64 * 1024),
                title: limitStringSize(`${m.attr_status} -> ${m.mutatedClass}:${m.mutatedMethod}`, 255)
            };
            annotations.push(annotation);
        });
    });
    return annotations;
}
exports.createAnnotations = createAnnotations;
/**
 * Helper method to cut off text at certain size and add three dots to indicate that there should be more text
 * @param text the text to cut-off
 * @param maxSize max size that the text may be
 * @returns string cut-off at max size
 */
function limitStringSize(text, maxSize) {
    return text.length <= maxSize ? text : text.substring(0, maxSize - 3) + "...";
}
