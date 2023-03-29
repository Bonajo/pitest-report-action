import * as core from '@actions/core';
import * as github from '@actions/github';

import { getPath, parseMutationReport } from "./parser";
import { createAnnotations, AnnotationType } from "./annotation";
import { Summary } from "./summary";

/**
 * Main method for the pitest report action
 */
async function run(): Promise<void> {
    try{
        // Read inputs
        const file = core.getInput("file");
        const summary = core.getBooleanInput("summary");
        const annotationsString = core.getInput("annotation-types");
        const output = core.getInput("output");
        const maxAnnotations =  parseInt(core.getInput("max-annotations"), 10);
        const name = core.getInput("name");
        const token = core.getInput("token");
        const threshold = parseInt(core.getInput("threshold"));
        const octokit = github.getOctokit(token);
        let checksId;

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
        }

        // Read the mutations.xml and parse to objects
        const path = await getPath(file);
        const mutations = await parseMutationReport(path);

        // Create the annotations
        const annotations = createAnnotations(mutations, maxAnnotations, annotationTypes);

        // Create summary
        const results = mutations.mutations
            .reduce((acc, val) => acc.process(val), new Summary());

        // Set outputs
        core.setOutput("killed", results.killed);
        core.setOutput("survived", results.survived);

        // Add the annotations
        if(output === "checks"){
            core.info("Update the checks run...");
            // Update the checks run
            const res = await octokit.rest.checks.update({
                check_run_id: checksId,
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                status: 'completed',
                conclusion: (results.strength < threshold) ? 'failure' : 'success',
                output: {
                    title: name,
                    summary: results.toSummaryMarkdown(),
                    annotations: [...annotations]
                }
            });
            core.info(`Update checks run response: ${res.status}`)
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

    }catch(error){
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run()