import * as core from '@actions/core';
import * as github from '@actions/github';

import { getPaths, parseMutationReport } from "./parser.js";
import { createAnnotations, AnnotationType, ANNOTATION_TYPES } from "./annotation.js";
import { Summary } from "./summary.js";
import {getCheckRunSha} from "./context.js";
import { listRepositoryFiles, SourceResolver } from "./sources.js";

/**
 * Main method for the pitest report action
 */
export async function run(): Promise<void> {
    let checksRunOngoing = false;
    let token;
    let octokit;
    let checksId;
    try{
        // Read inputs
        const file = core.getInput("file");
        const summary = core.getBooleanInput("summary");
        const annotationsString = core.getInput("annotation-types");
        const output = core.getInput("output");
        const maxAnnotationsString = core.getInput("max-annotations");
        const name = core.getInput("name");
        token = core.getInput("token");
        const thresholdString = core.getInput("threshold");

        // Validate inputs, fail before anything is created
        if(!ANNOTATION_TYPES.includes(annotationsString as AnnotationType)){
            throw new Error(`Annotations should be one of ALL, KILLED or SURVIVED, but was ${annotationsString}`);
        }
        const annotationTypes = <AnnotationType>annotationsString;

        if(output !== "checks" && output !== "workflow"){
            throw new Error(`Output should either be 'checks' or 'workflow', but is ${output}`);
        }

        const maxAnnotations = Number(maxAnnotationsString);
        if(!Number.isInteger(maxAnnotations) || maxAnnotations < 1 || maxAnnotations > 50){
            throw new Error(`Max number of annotations should be a number between 1 and 50, but is ${maxAnnotationsString}`);
        }

        const threshold = Number(thresholdString);
        if(isNaN(threshold) || threshold < 0 || threshold > 100){
            throw new Error(`Threshold should be a number between 0 and 100, but is ${thresholdString}`);
        }

        octokit = github.getOctokit(token);

        // Get path to file
        const paths = await getPaths(file);

        // Create check run if needed
        if(output === "checks"){
            core.info("Creating checks run");
            const checks = await octokit.rest.checks.create({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                name: name,
                head_sha: getCheckRunSha(),
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

        // Read the mutation reports and parse to objects
        const reports = await Promise.all(paths.map(path => parseMutationReport(path)));

        // Create the annotations
        // Place the annotations on the source files in the repository
        const sources = new SourceResolver(await listRepositoryFiles());
        const annotations = createAnnotations(reports, maxAnnotations, annotationTypes, (mutation, report) => {
            const path = sources.resolve(mutation, report.path);
            if(path === undefined){
                core.info(`Source file of ${mutation.mutatedClass} not found in the repository, using the class name as path`);
            }
            return path;
        });

        // Create summary
        const results = reports
                            .flatMap(report => report.mutations)
                            .reduce((acc, val) => acc.process(val), new Summary());

        // Set outputs
        core.setOutput("killed", results.killed);
        core.setOutput("survived", results.survived);
        core.setOutput("no-coverage", results.noCoverage);

        const hasFailed = results.strength < threshold;

        // Add the annotations
        if(output === "checks" && typeof checksId == "number"){
            core.info("Update the checks run...");
            // Update the checks run
            const res = await octokit.rest.checks.update({
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
        }else{
            // Add annotations on the workflow itself
            const annotate = {notice: core.notice, warning: core.warning, failure: core.error};
            for(const annotation of annotations){
                annotate[annotation.annotation_level](annotation.message, {
                    title: annotation.title,
                    file: annotation.path,
                    startLine: annotation.start_line
                });
            }
        }

        if(summary){            
            await core.summary
                .addHeading("Pitest results")
                .addTable(results.toSummaryTable())
                .write();
        }

        if(hasFailed){
            core.setFailed(`Threshold is not reached. Test strength: ${results.strength}`);
        }

    }catch(error){
        let message: string;
        if (error instanceof Error) {
            message = error.message;
        }else{
            message = `${error}`;
        }
        core.setFailed(message);
        if(checksRunOngoing){
            // If the checks run is started, octokit and checksId have to be defined
            // @ts-ignore
            await octokit.rest.checks.update({
                // @ts-ignore
                check_run_id: checksId,
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                // @ts-ignore
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
}