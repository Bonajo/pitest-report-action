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
exports.parseMutationReport = exports.readFile = void 0;
const fast_xml_parser_1 = require("fast-xml-parser");
const glob = __importStar(require("@actions/glob"));
const core = __importStar(require("@actions/core"));
const promises_1 = __importDefault(require("fs/promises"));
function readFile(pattern) {
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
        if (!file.endsWith('xml')) {
            throw new Error(`Matched file (${file}) doesn't end in 'xml'`);
        }
        return yield promises_1.default.readFile(file, { encoding: 'utf8' });
    });
}
exports.readFile = readFile;
function parseMutationReport(data) {
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
    return parser.parse(data);
}
exports.parseMutationReport = parseMutationReport;
