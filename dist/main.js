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
/**
 * Main method for the pitest report action
 */
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Read inputs
            const file = core.getInput("file");
            const summary = core.getBooleanInput("summary");
            const annotationsString = core.getInput("annotation-types");
            const output = core.getInput("output");
            const maxAnnotations = parseInt(core.getInput("max-annotations"), 10);
            const name = core.getInput("name");
            const token = core.getInput("token");
            const octokit = github.getOctokit(token);
            let checksId;
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
            // Create check run if needed
            if (output === "checks") {
                const checks = yield octokit.rest.checks.create({
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    name: name,
                    head_sha: github.context.sha,
                    status: 'in_progress',
                    output: {
                        title: name,
                        summary: ''
                    }
                });
                checksId = checks.data.id;
            }
            // Read the mutations.xml and parse to objects
            const path = yield (0, parser_1.getPath)(file);
            const mutations = yield (0, parser_1.parseMutationReport)(path);
            // Create the annotations
            const annotations = (0, annotation_1.createAnnotations)(mutations, maxAnnotations, annotationTypes);
            // Create summary
            const results = mutations.mutations
                .reduce((acc, val) => acc.process(val), new summary_1.Summary());
            // Set outputs
            core.setOutput("killed", results.killed);
            core.setOutput("survived", results.survived);
            // Add the annotations
            if (output === "checks") {
                // Update the checks run
                yield octokit.rest.checks.update({
                    check_run_id: checksId,
                    owner: github.context.repo.owner,
                    repo: github.context.repo.repo,
                    status: 'completed',
                    conclusion: 'success',
                    output: {
                        title: name,
                        summary: results.toSummaryMarkdown(),
                        annotations: [...annotations]
                    }
                });
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
        }
        catch (error) {
            if (error instanceof Error) {
                core.setFailed(error.message);
            }
        }
    });
}
run();
