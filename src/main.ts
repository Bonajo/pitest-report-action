import * as core from '@actions/core';

import {getSourcePath, parseMutationReport, readFile} from "./parser";
import {createAnnotations, AnnotationType} from "./annotation";
import * as github from '@actions/github';

async function run(): Promise<void> {
    try{
        // Read inputs
        const file = core.getInput("file");
        const summary = core.getBooleanInput("summary");
        const annotationsString = core.getInput("annotation-types");
        const output = core.getInput("output");
        const maxAnnotations =  parseInt(core.getInput("max-annotations"), 10);

        // Validate inputs
        if(!annotationsString || ['ALL', 'KILLED', 'SURVIVED'].indexOf(annotationsString) === -1){
            core.setFailed(`Annotations should be one of ALL, KILLED or SURVIVED, but was ${annotationsString}`);
        }
        const annotationTypes = <AnnotationType>annotationsString;

        if(output !== "check" && output !== "summary"){
            core.setFailed(`Ouput should either be 'check' or 'summary', but is ${output}`);
        }

        if(!maxAnnotations || isNaN(maxAnnotations)){
            core.setFailed(`Max number of annotations should be a number and max of 50, but is ${maxAnnotations}`);
        }

        // Read the mutations.xml and parse to objects
        const data = await readFile(file);
        const mutations = parseMutationReport(data);
        const basePath = getSourcePath(file);
        const annotations = createAnnotations(mutations, maxAnnotations, annotationTypes, basePath);

        if(output === "check"){
            const token = core.getInput("token");
            const octokit = github.getOctokit(token);
            await octokit.rest.checks.create({
                owner: github.context.repo.owner,
                repo: github.context.repo.repo,
                name: 'Pitest report',
                head_sha: github.context.sha,
                status: 'completed',
                conclusion: 'neutral',
                output: {
                    title: 'Pitest report results',
                    summary: 'test',
                    annotations: [...annotations]
                }
            });
        }else{
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

        const results = annotations.reduce((acc, val) => {
            val.annotation_level === "notice" ? acc.SURVIVED++ : acc.KILLED++;
            return acc;
        }, {KILLED: 0, SURVIVED: 0});
        
        core.setOutput("killed", results.KILLED);
        core.setOutput("survived", results.SURVIVED);

        if(summary){            
            await core.summary
                .addHeading("Pitest results")
                .addTable([
                    [{data: 'Class', header: true}, {data: 'KILLED', header: true}, {data: 'SURVIVED', header: true}],
                    ['All', results.KILLED.toString(), results.SURVIVED.toString()]
                ])
                .write();
        }

    }catch(error){
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run()