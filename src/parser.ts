import {X2jOptionsOptional, XMLParser} from "fast-xml-parser";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import fs from "fs/promises";
import {Report} from "./report";

export async function getPath(pattern: string): Promise<string> {
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
    return file;
}

export async function readFile(path: string): Promise<string> {
    return await fs.readFile(path, {encoding: 'utf8'});
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

/**
 * For now, we assume that the mutations.xml file is inside the target directory
 * @param file path to the mutations.xml file
 * @return base path pointing to src directory
 */
export function getSourcePath(file: string): string {
    const targetIndex = file.indexOf("target");
    if(targetIndex > -1){
        return `${file.substring(0, targetIndex)}src/main/java`;
    }
    throw new Error(`Cannot find src directory`)
}