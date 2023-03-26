"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
/**
 * Class to unify different types of mutation reports
 */
class Report {
    constructor(type, path, mutations) {
        this._type = type;
        this._path = path;
        this._mutations = mutations;
    }
    get type() {
        return this._type;
    }
    get path() {
        return this._path;
    }
    get mutations() {
        return this._mutations;
    }
}
Report.supportedTypes = ["XML", "CSV"];
exports.Report = Report;
