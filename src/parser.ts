import {X2jOptionsOptional, XMLParser} from "fast-xml-parser";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import fs from "fs/promises";


export async function readFile(pattern: string): Promise<string> {
    const globber = await glob.create(pattern);
    const files = await globber.glob();
    if(files.length == 0){
        throw new Error(`No matching file found for ${pattern}`);
    }else if(files.length > 1){
        core.warning(`Action supports only one mutations.xml at a time, will only use ${files[0]}`);
    }
    const file = files[0]
    if(!file.endsWith('xml')){
        throw new Error(`Matched file (${file}) doesn't end in 'xml'`)
    }

    return await fs.readFile(file, {encoding: 'utf8'});
}

export function parseMutationReport(data: string): Report {
    const arrays = [
        "mutations.mutation",
        "mutations.mutation.indexes",
        "mutations.mutation.blocks"
    ]
    const options: X2jOptionsOptional = {
        ignorePiTags: true,
        ignoreAttributes: false,
        parseAttributeValue: true,
        attributeNamePrefix: "attr_",
        isArray: (tagName, jPath, isLeafNode) => arrays.indexOf(jPath) !== -1
    }
    const parser = new XMLParser(options);
    return parser.parse(data);
}