"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMutationReport = exports.readFile = exports.getPath = void 0;
const fast_xml_parser_1 = require("fast-xml-parser");
const glob = __importStar(require("@actions/glob"));
const core = __importStar(require("@actions/core"));
const promises_1 = __importDefault(require("fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const csv_parse_1 = require("csv-parse");
const report_1 = require("./report");
/**
 * Get single path from glob
 * @param pattern pattern to convert to path
 * @returns Promise<string> single path that matched the glob
 * @throws Error when no files match the pattern
 */
function getPath(pattern) {
    return __awaiter(this, void 0, void 0, function* () {
        const globber = yield glob.create(pattern);
        const files = yield globber.glob();
        if (files.length == 0) {
            throw new Error(`No matching file found for ${pattern}`);
        }
        else if (files.length > 1) {
            core.warning(`Action supports only one mutations.xml at a time, will only use ${files[0]}`);
        }
        const file = files[0];
        return node_path_1.default.relative(process.cwd(), file);
    });
}
exports.getPath = getPath;
/**
 * Read file and return contents as string
 * @param path to the file
 * @returns Promise<string> the contents of the file
 */
function readFile(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield promises_1.default.readFile(path, { encoding: 'utf8' });
    });
}
exports.readFile = readFile;
/**
 * Read and parse a mutation report and convert it to a Report class
 * @param file the mutation report to read
 * @returns Promise<Report> the parsed mutation report
 * @throws Error if file doesn't exist
 * @throws Error if the file has invalid extension
 * @throws Error if the file cannot be parsed
 */
function parseMutationReport(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const extension = node_path_1.default.extname(file).toUpperCase().substring(1);
        if (report_1.Report.supportedTypes.indexOf(extension) === -1) {
            throw new Error(`Invalid file extension, expected one of ${report_1.Report.supportedTypes.join(", ")}, but was '${extension}'`);
        }
        const data = yield readFile(file);
        let mutations = [];
        switch (extension) {
            case 'XML':
                mutations = parseXMLReport(data);
                break;
            case 'CSV':
                mutations = parseCSVReport(data);
                break;
        }
        return new report_1.Report(extension, file, mutations);
    });
}
exports.parseMutationReport = parseMutationReport;
/**
 * Helper method to parse xml mutation report
 * @param data the xml data as string
 * @returns Mutation[] array containing parsed mutations
 */
function parseXMLReport(data) {
    const arrays = [
        "mutations.mutation",
        "mutations.mutation.indexes",
        "mutations.mutation.blocks"
    ];
    const options = {
        ignorePiTags: true,
        ignoreAttributes: false,
        parseAttributeValue: true,
        attributeNamePrefix: "attr_",
        isArray: (tagName, jPath, isLeafNode) => arrays.indexOf(jPath) !== -1
    };
    const parser = new fast_xml_parser_1.XMLParser(options);
    const xmlReport = parser.parse(data);
    return xmlReport.mutations.mutation;
}
/**
 * Helper method to parse CSV mutation report
 * @param data the csv data as string
 * @returns Mutation[] array contained the parsed mutations
 */
function parseCSVReport(data) {
    const mutations = [];
    const parser = (0, csv_parse_1.parse)({
        delimiter: ','
    });
    parser.on('readable', () => {
        let mutation;
        while ((mutation = parser.read()) !== null) {
            mutations.push({
                sourceFile: mutation[0],
                mutatedClass: mutation[1],
                mutator: mutation[2],
                mutatedMethod: mutation[3],
                lineNumber: parseInt(mutation[4], 10),
                attr_status: mutation[5],
                killingTest: (mutation[6] === "none") ? undefined : mutation[6]
            });
        }
    });
    parser.on('error', (error) => {
        throw new Error(`Unable to parse CSV, error: ${error.message}`);
    });
    parser.write(data);
    parser.end();
    return mutations;
}
