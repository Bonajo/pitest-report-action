"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const parser_1 = require("./parser");
const annotation_1 = require("./annotation");
const summary_1 = require("./summary");
const context_1 = require("./context");
/**
 * Main method for the pitest report action
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let checksRunOngoing = false;
        let token;
        let octokit;
        let checksId;
        try {
            // Read inputs
            const file = core.getInput("file");
            const summary = core.getBooleanInput("summary");
            const annotationsString = core.getInput("annotation-types");
            const output = core.getInput("output");
            const maxAnnotations = parseInt(core.getInput("max-annotations"), 10);
            const name = core.getInput("name");
            token = core.getInput("token");
            const threshold = parseInt(core.getInput("threshold"));
            octokit = github.getOctokit(token);
            // Validate inputs
            if (!annotationsString || ['ALL', 'KILLED', 'SURVIVED'].indexOf(annotationsString) === -1) {
                core.setFailed(`Annotations should be one of ALL, KILLED or SURVIVED, but was ${annotationsString}`);
            }
            const annotationTypes = annotationsString;
            if (output !== "checks" && output !== "summary") {
                core.setFailed(`Ouput should either be 'check' or 'summary', but is ${output}`);
            }
            if (!maxAnnotations || isNaN(maxAnnotations)) {
                core.setFailed(`Max number of annotations should be a number and max of 50, but is ${maxAnnotations}`);
            }
            // Get path to file
            const paths = yield (0, parser_1.getPaths)(file);
            // Create check run if needed
            if (output === "checks") {
                core.info("Creating checks run");
                const checks = yield octokit.rest.checks.create({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    name: name,
                    head_sha: (0, context_1.getCheckRunSha)(),
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    output: {
                        title: name,
                        summary: `${name} in progress...`
                    }
                });
                checksId = checks.data.id;
                core.info(`Checks run created with id: ${checksId}`);
                checksRunOngoing = true;
            }
            // Read the mutations.xml and parse to objects
            const reports = yield Promise.all(paths.map(path => (0, parser_1.parseMutationReport)(path)));
            // Create the annotations
            const annotations = (0, annotation_1.createAnnotations)(reports, maxAnnotations, annotationTypes);
            // Create summary
            const results = reports
                .flatMap(report => report.mutations)
                .reduce((acc, val) => acc.process(val), new summary_1.Summary());
            // Set outputs
            core.setOutput("killed", results.killed);
            core.setOutput("survived", results.survived);
            const hasFailed = results.strength < threshold;
            // Add the annotations
            if (output === "checks") {
                core.info("Update the checks run...");
                // Update the checks run
                const res = yield octokit.rest.checks.update({
                    check_run_id: checksId,
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    status: 'completed',
                    conclusion: hasFailed ? 'failure' : 'success',
                    completed_at: new Date().toISOString(),
                    output: {
                        title: name,
                        summary: results.toSummaryMarkdown(),
                        annotations: [...annotations]
                    }
                });
                core.info(`Update checks run response: ${res.url}`);
                checksRunOngoing = false;
            }
            else {
                // Add annotations on the workflow itself
                for (const annotation of annotations) {
                    let fn;
                    switch (annotation.annotation_level) {
                        case "notice":
                            fn = core.notice;
                            break;
                        case "warning":
                            fn = core.warning;
                            break;
                        case "failure":
                            fn = core.error;
                            break;
                    }
                    fn(annotation.message, {
                        title: annotation.title,
                        file: annotation.path,
                        startLine: annotation.start_line
                    });
                }
            }
            if (summary) {
                yield core.summary
                    .addHeading("Pitest results")
                    .addTable(results.toSummaryTable())
                    .write();
            }
            if (hasFailed) {
                core.setFailed(`Threshold is not reached. Test strength: ${results.strength}`);
            }
        }
        catch (error) {
            let message;
            if (error instanceof Error) {
                message = error.message;
            }
            else {
                message = `${error}`;
            }
            core.setFailed(message);
            if (checksRunOngoing) {
                // If the checks run is started, octokit has to be defined
                // @ts-ignore
                yield octokit.rest.checks.update({
                    check_run_id: checksId,
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    status: 'completed',
                    conclusion: 'failure',
                    completed_at: new Date().toISOString(),
                    output: {
                        title: 'Action failed',
                        summary: message
                    }
                });
            }
        }
    });
}
run();
