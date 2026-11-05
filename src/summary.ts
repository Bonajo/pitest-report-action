import {isDetected, Mutation} from "./report.js";
import * as core from "@actions/core";

type SummaryTableRow = Parameters<typeof core.summary.addTable>[0][number];

/**
 * Helper class to keep track of statistics
 */
class SummaryStat {
    private _killed: number = 0;
    private _survived: number = 0;
    private _noCoverage: number = 0;

    /**
     * Number of mutations detected by the tests (KILLED, TIMED_OUT, MEMORY_ERROR, RUN_ERROR, NON_VIABLE)
     */
    get killed(): number {
        return this._killed;
    }

    /**
     * Number of mutations that were covered by tests, but not detected
     */
    get survived(): number {
        return this._survived;
    }

    /**
     * Number of mutations that were not covered by any test
     */
    get noCoverage(): number {
        return this._noCoverage;
    }

    get total(): number {
        return this.killed + this.survived + this.noCoverage;
    }

    public add(mutation: Mutation): void {
        if(isDetected(mutation)){
            this._killed++;
        }else if(mutation.attr_status === "NO_COVERAGE"){
            this._noCoverage++;
        }else{
            this._survived++;
        }
    }
}

/**
 * Summary class to calculate statistics from mutations
 */
export class Summary {
    private stats = new Map<string, SummaryStat>();
    private readonly _total = new SummaryStat();

    /**
     * Process a mutation
     * @param mutation the mutation to process
     * @returns Summary for fluent programming
     */
    public process(mutation: Mutation): Summary {
        let stat = this.stats.get(mutation.mutatedClass);
        if(stat === undefined){
            stat = new SummaryStat();
            this.stats.set(mutation.mutatedClass, stat);
        }
        stat.add(mutation);
        this._total.add(mutation);
        return this;
    }

    /**
     * Get total number of killed (detected) mutations processed so far
     */
    public get killed(): number {
        return this._total.killed;
    }

    /**
     * Get total number of survived mutations processed so far
     */
    public get survived(): number {
        return this._total.survived;
    }

    /**
     * Get total number of mutations without test coverage processed so far
     */
    public get noCoverage(): number {
        return this._total.noCoverage;
    }

    /**
     * Get total number of mutations processed so far
     */
    public get total(): number {
        return this._total.total;
    }

    /**
     * Test strength as calculated by pitest: percentage of the covered mutations that were killed.
     * Mutations without coverage are excluded.
     */
    public get strength(): number {
        const covered = this._total.total - this._total.noCoverage;
        if(covered === 0) {
            return 0;
        }
        return this._total.killed / covered * 100;
    }

    /**
     * Convert this summary to a SummaryTable
     */
    public toSummaryTable(): SummaryTableRow[]{
        const headers = [
            {data: 'Class', header: true},
            {data: 'Mutations', header: true},
            {data: 'KILLED', header: true},
            {data: 'SURVIVED', header: true},
            {data: 'NO_COVERAGE', header: true}
        ];
        const rows = Array.from(this.stats.entries())
            .map(([name, stat]) => [name, ...Summary.columns(stat)]);

        rows.push(["Total", ...Summary.columns(this._total)]);

        return [headers, ...rows];
    }

    /**
     * Convert this summary to a Markdown table
     */
    public toSummaryMarkdown(): string {
        const headers: string = '| Class | Mutations | KILLED | SURVIVED | NO_COVERAGE |';
        const separator: string = '| --- | --- | --- | --- | --- |';
        const rows: string[] = Array.from(this.stats.entries())
            .map(([name, stat]) => `| ${[name, ...Summary.columns(stat)].join(" | ")} |`);
        const total = `| ${["Total", ...Summary.columns(this._total)].join(" | ")} |`;
        return [headers, separator, ...rows, total].join("\n");
    }

    /**
     * The numeric columns of a table row
     */
    private static columns(stat: SummaryStat): string[] {
        return [`${stat.total}`, `${stat.killed}`, `${stat.survived}`, `${stat.noCoverage}`];
    }
}
