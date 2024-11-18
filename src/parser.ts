import { X2jOptions, XMLParser } from "fast-xml-parser";
import * as glob from "@actions/glob";
import fs from "fs/promises";
import path from "node:path";
import { parse } from "csv-parse";
import {Mutation, MutationStatus, Report, XMLReport} from "./report";

/**
 * Get single path from glob
 * @param pattern pattern to convert to path
 * @returns Promise<string> single path that matched the glob
 * @throws Error when no files match the pattern
 */
export async function getPaths(pattern: string): Promise<string[]> {
    const globber = await glob.create(pattern);
    const files = await globber.glob();
    if(files.length == 0){
        throw new Error(`No matching file found for ${pattern}`);
    }
    return files.map(file => path.relative(process.cwd(), file));
}

/**
 * Read file and return contents as string
 * @param path to the file
 * @returns Promise<string> the contents of the file
 */
export async function readFile(path: string): Promise<string> {
    return await fs.readFile(path, {encoding: 'utf8'});
}

/**
 * Read and parse a mutation report and convert it to a Report class
 * @param file the mutation report to read
 * @returns Promise<Report> the parsed mutation report
 * @throws Error if file doesn't exist
 * @throws Error if the file has invalid extension
 * @throws Error if the file cannot be parsed
 */
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

/**
 * Helper method to parse xml mutation report
 * @param data the xml data as string
 * @returns Mutation[] array containing parsed mutations
 */
function parseXMLReport(data: string): Mutation[] {
    const arrays = [
        "mutations.mutation",
        "mutations.mutation.indexes",
        "mutations.mutation.blocks"
    ]
    const options: X2jOptions = {
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

/**
 * Helper method to parse CSV mutation report
 * @param data the csv data as string
 * @returns Mutation[] array contained the parsed mutations
 */
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