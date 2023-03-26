import { X2jOptionsOptional, XMLParser } from "fast-xml-parser";
import * as glob from "@actions/glob";
import * as core from "@actions/core";
import fs from "fs/promises";
import path from "node:path";
import { parse } from "csv-parse";
import {Mutation, MutationStatus, Report, XMLReport} from "./report";

export async function getPath(pattern: string): Promise<string> {
    const globber = await glob.create(pattern);
    const files = await globber.glob();
    if(files.length == 0){
        throw new Error(`No matching file found for ${pattern}`);
    }else if(files.length > 1){
        core.warning(`Action supports only one mutations.xml at a time, will only use ${files[0]}`);
    }
    const file = files[0];
    return path.relative(process.cwd(), file);
}

export async function readFile(path: string): Promise<string> {
    return await fs.readFile(path, {encoding: 'utf8'});
}

export async function parseMutationReport(file: string): Promise<Report> {
    const extension = path.extname(file).toUpperCase().substring(1);
    if(Report.supportedTypes.indexOf(extension) === -1){
        throw new Error(`Invalid file extension, expected one of ${Report.supportedTypes.join(", ")}, but was '${extension}'`);
    }
    const data = await readFile(file);

    let mutations: Mutation[] = [];
    switch (extension){
        case 'XML':
            mutations = parseXMLReport(data); break;
        case 'CSV':
            mutations =  parseCSVReport(data); break;
    }
    return new Report(extension, file, mutations);
}

function parseXMLReport(data: string): Mutation[] {
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
    const xmlReport: XMLReport = parser.parse(data);
    return xmlReport.mutations.mutation;
}

function parseCSVReport(data: string): Mutation[]{
    const mutations: Mutation[] = [];
    const parser = parse({
        delimiter: ','
    });

    parser.on('readable', () => {
        let mutation;
        while((mutation = parser.read()) !== null){
            mutations.push({
                sourceFile: <string>mutation[0],
                mutatedClass: <string>mutation[1],
                mutator: <string>mutation[2],
                mutatedMethod: <string>mutation[3],
                lineNumber: parseInt(mutation[4], 10),
                attr_status: <MutationStatus>mutation[5],
                killingTest: (mutation[6] === "none") ? undefined : mutation[6]
            });
        }
    });

    parser.on('error', (error) => {
        throw new Error(`Unable to parse CSV, error: ${error.message}`)
    });

    parser.write(data);
    parser.end();

    return mutations;
}