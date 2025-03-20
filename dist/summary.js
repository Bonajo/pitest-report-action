"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Summary = void 0;
/**
 * Helper class to keep track of statistics
 */
class SummaryStat {
    constructor() {
        this._survived = 0;
        this._killed = 0;
    }
    get survived() {
        return this._survived;
    }
    get killed() {
        return this._killed;
    }
    get total() {
        return this.killed + this.survived;
    }
    increaseSurvived() {
        this._survived++;
    }
    increaseKilled() {
        this._killed++;
    }
}
/**
 * Summary class to calculate statistics from mutations
 */
class Summary {
    constructor() {
        this.stats = new Map();
        this._total = new SummaryStat();
    }
    /**
     * Process a mutation
     * @param mutation the mutation to process
     * @returns Summary for fluent programming
     */
    process(mutation) {
        if (!mutation) {
            return this;
        }
        if (!this.stats.has(mutation.mutatedClass)) {
            this.stats.set(mutation.mutatedClass, new SummaryStat());
        }
        const stat = this.stats.get(mutation.mutatedClass);
        if (mutation.attr_status === "KILLED") {
            stat === null || stat === void 0 ? void 0 : stat.increaseKilled();
            this._total.increaseKilled();
        }
        else {
            stat === null || stat === void 0 ? void 0 : stat.increaseSurvived();
            this._total.increaseSurvived();
        }
        return this;
    }
    /**
     * Get total number of killed mutations processed so far
     */
    get killed() {
        return this._total.killed;
    }
    /**
     * Get total number of survived mutations processed so far
     */
    get survived() {
        return this._total.survived;
    }
    /**
     * Get total number of mutations processed so far
     */
    get total() {
        return this._total.total;
    }
    get strength() {
        return this._total.killed / this._total.total * 100;
    }
    /**
     * Convert this summary to a SummaryTable
     */
    toSummaryTable() {
        const headers = [
            { data: 'Class', header: true },
            { data: 'Mutations', header: true },
            { data: 'KILLED', header: true },
            { data: 'SURVIVED', header: true }
        ];
        const rows = Array.from(this.stats.entries())
            .map(v => [v[0], `${v[1].total}`, `${v[1].killed}`, `${v[1].survived}`]);
        rows.push(["Total", `${this.total}`, `${this.killed}`, `${this.survived}`]);
        return [headers, ...rows];
    }
    /**
     * Convert this summary to a Markdown table
     */
    toSummaryMarkdown() {
        const headers = '| Class | Mutations | KILLED | SURVIVED |';
        const separator = '| --- | --- | --- | --- |';
        const rows = Array.from(this.stats.entries())
            .map(v => `| ${v[0]} | ${v[1].total} | ${v[1].killed} | ${v[1].survived} |`);
        const total = `| Total | ${this.total} | ${this.killed} | ${this.survived} |`;
        return [headers, separator, ...rows, total].join("\n");
    }
}
exports.Summary = Summary;
