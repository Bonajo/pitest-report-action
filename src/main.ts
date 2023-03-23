import * as core from '@actions/core';

import {parseMutationReport, readFile} from "./parser";
import {AnnotationProperties} from "@actions/core";

async function run(): Promise<void> {
    try{
        const file = core.getInput("file");
        const data = await readFile(file);
        const summary = core.getBooleanInput("summary");

        const mutations = parseMutationReport(data);

        for(const mutation of mutations.mutations.mutation){
            if(mutation.attr_status === "SURVIVED"){
                const properties: AnnotationProperties = {
                    title: mutation.description,
                    file: mutation.sourceFile,
                    startLine: mutation.lineNumber
                }
                core.warning(mutation.description, properties);
            }
        }

        if(summary){
            core.summary.addDetails("test", "*bold*?");
            await core.summary.write()
        }

    }catch(error){
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run()