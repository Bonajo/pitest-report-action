import { X2jOptions, XMLParser, XMLValidator } from "fast-xml-parser";
import * as glob from "@actions/glob";
import fs from "fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {Mutation, MutationStatus, Report, XMLMutations, XMLReport} from "./report.js";

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
            mutations = parseXMLReport(data, file); break;
        case 'CSV':
            mutations = parseCSVReport(data); break;
    }
    return new Report(extension, file, mutations);
}

/**
 * Check if the mutations field of the XMLReport is actually of type XMLMutations
 * @param obj
 * @returns boolean true if obj instanceof XMLMutations
 */
function isXMLMutations(obj: any): obj is XMLMutations {
    return typeof obj === "object" &&
        obj !== null &&
        "mutation" in obj &&
        Array.isArray(obj.mutation);
}

/**
 * Helper method to parse xml mutation report
 * @param data the xml data as string
 * @param file the file the data was read from, used in error messages
 * @returns Mutation[] array containing parsed mutations
 * @throws Error if the data is not valid XML or not a pitest mutation report
 */
function parseXMLReport(data: string, file: string): Mutation[] {
    const validation = XMLValidator.validate(data);
    if(validation !== true){
        throw new Error(`Invalid XML in ${file}: ${validation.err.msg} (line ${validation.err.line})`);
    }
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
        isArray: (tagName, jPath, isLeafNode) => arrays.indexOf(String(jPath)) !== -1
    }
    const parser = new XMLParser(options);
    const xmlReport: Partial<XMLReport> = parser.parse(data);
    if(xmlReport.mutations === undefined){
        throw new Error(`${file} is not a pitest mutation report, missing <mutations> root element`);
    }
    // If not valid XMLMutations (e.g. empty mutations is parsed as empty string "")
    if(!isXMLMutations(xmlReport.mutations)) {
        return [];
    }
    return xmlReport.mutations.mutation;
}

/**
 * Helper method to parse CSV mutation report
 * @param data the csv data as string
 * @returns Mutation[] array contained the parsed mutations
 * @throws Error if the data cannot be parsed as CSV
 */
function parseCSVReport(data: string): Mutation[]{
    let records: string[][];
    try {
        records = parse(data, {delimiter: ','});
    } catch (error) {
        // csv-parse always throws a CsvError (subclass of Error)
        throw new Error(`Unable to parse CSV, error: ${(error as Error).message}`);
    }
    return records.map(record => ({
        sourceFile: record[0],
        mutatedClass: record[1],
        mutator: record[2],
        mutatedMethod: record[3],
        lineNumber: parseInt(record[4], 10),
        attr_status: <MutationStatus>record[5],
        killingTest: (record[6] === "none") ? undefined : record[6]
    }));
}
