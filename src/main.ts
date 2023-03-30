import * as core from '@actions/core';
import * as github from '@actions/github';

import { getPath, parseMutationReport } from "./parser";
import { createAnnotations, AnnotationType } from "./annotation";
import { Summary } from "./summary";

/**
 * Main method for the pitest report action
 */
async function run(): Promise<void> {
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
        const maxAnnotations =  parseInt(core.getInput("max-annotations"), 10);
        const name = core.getInput("name");
        token = core.getInput("token");
        const threshold = parseInt(core.getInput("threshold"));
        octokit = github.getOctokit(token);

        // Validate inputs
        if(!annotationsString || ['ALL', 'KILLED', 'SURVIVED'].indexOf(annotationsString) === -1){
            core.setFailed(`Annotations should be one of ALL, KILLED or SURVIVED, but was ${annotationsString}`);
        }
        const annotationTypes = <AnnotationType>annotationsString;

        if(output !== "checks" && output !== "summary"){
            core.setFailed(`Ouput should either be 'check' or 'summary', but is ${output}`);
        }

        if(!maxAnnotations || isNaN(maxAnnotations)){
            core.setFailed(`Max number of annotations should be a number and max of 50, but is ${maxAnnotations}`);
        }

        // Get path to file
        const path = await getPath(file);

        // Create check run if needed
        if(output === "checks"){
            core.info("Creating checks run");
            const checks = await octokit.rest.checks.create({
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
            core.info(`Checks run created with id: ${checksId}`);
            checksRunOngoing = true;
        }

        // Read the mutations.xml and parse to objects
        const mutations = await parseMutationReport(path);

        // Create the annotations
        const annotations = createAnnotations(mutations, maxAnnotations, annotationTypes);

        // Create summary
        const results = mutations.mutations
            .reduce((acc, val) => acc.process(val), new Summary());

        // Set outputs
        core.setOutput("killed", results.killed);
        core.setOutput("survived", results.survived);

        const hasFailed = results.strength < threshold;

        // Add the annotations
        if(output === "checks"){
            core.info("Update the checks run...");
            // Update the checks run
            const res = await octokit.rest.checks.update({
                check_run_id: checksId,
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                status: 'completed',
                conclusion: hasFailed ? 'failure' : 'success',
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
            for(const annotation of annotations){
                let fn;
                switch(annotation.annotation_level){
                    case "notice":
                        fn = core.notice; break;
                    case "warning":
                        fn = core.warning; break;
                    case "failure":
                        fn = core.error; break;
                }
                fn(annotation.message, {
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
            // If the checks run is started, octokit has to be defined
            // @ts-ignore
            await octokit.rest.checks.update({
                check_run_id: checksId,
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                status: 'completed',
                conclusion: 'failure',
                output: {
                    title: 'Action failed',
                    summary: message
                }
            });
        }
    }
}

run()