import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as fs from 'fs/promises';
import { XMLParser } from "fast-xml-parser";

async function readFile(pattern: string): Promise<string> {
    const globber = await glob.create(pattern);
    const files = await globber.glob();
    if(files.length == 0){
        throw new Error("No matching file found");
    }else if(files.length > 1){
        core.warning(`Action supports only one mutations.xml at a time, will only use ${files[0]}`);
    }
    const file = files[0]
    if(!file.endsWith('xml')){
        throw new Error(`Matched file (${file}) doesn't end in 'xml'`)
    }

    return await fs.readFile(file, {encoding: 'utf8'});
}

async function run(): Promise<void> {
    try{
        const file = core.getInput("file");
        const data = await readFile(file);
        const summary = core.getBooleanInput("summary");

        const parser = new XMLParser();
        const mutations = parser.parse(data);
        core.debug(JSON.stringify(mutations));
        if(summary){
            core.summary.addCodeBlock(mutations, "json");
        }
    }catch(error){
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run()