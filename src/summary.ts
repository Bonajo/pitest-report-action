import {Mutation} from "./report";
import {SummaryTableRow} from "@actions/core/lib/summary";

/**
 * Helper class to keep track of statistics
 */
class SummaryStat {
    private _survived: number = 0;
    private _killed: number = 0;

    get survived(): number {
        return this._survived;
    }

    get killed(): number {
        return this._killed;
    }

    get total(): number {
        return this.killed + this.survived;
    }

    public increaseSurvived(): void {
        this._survived++;
    }

    public increaseKilled(): void {
        this._killed++;
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
    public process(mutation: Mutation | undefined): Summary {
        if(!mutation){
            return this;
        }
        if(!this.stats.has(mutation.mutatedClass)){
            this.stats.set(mutation.mutatedClass, new SummaryStat());
        }
        const stat = this.stats.get(mutation.mutatedClass);
        if(mutation.attr_status === "KILLED"){
            stat?.increaseKilled()
            this._total.increaseKilled();
        }else{
            stat?.increaseSurvived();
            this._total.increaseSurvived();
        }
        return this;
    }

    /**
     * Get total number of killed mutations processed so far
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
     * Get total number of mutations processed so far
     */
    public get total(): number {
        return this._total.total;
    }

    public get strength(): number {
        return this._total.killed / this._total.total * 100;
    }

    /**
     * Convert this summary to a SummaryTable
     */
    public toSummaryTable(): SummaryTableRow[]{
        const headers = [
            {data: 'Class', header: true},
            {data: 'Mutations', header: true},
            {data: 'KILLED', header: true},
            {data: 'SURVIVED', header: true}
        ];
        const rows = Array.from(this.stats.entries())
            .map(v => [v[0], `${v[1].total}`, `${v[1].killed}`, `${v[1].survived}`]);

        rows.push(["Total", `${this.total}`, `${this.killed}`, `${this.survived}`]);

        return [headers, ...rows];
    }

    /**
     * Convert this summary to a Markdown table
     */
    public toSummaryMarkdown(): string {
        const headers: string = '| Class | Mutations | KILLED | SURVIVED |';
        const separator: string = '| --- | --- | --- | --- |';
        const rows: string[] = Array.from(this.stats.entries())
            .map(v => `| ${v[0]} | ${v[1].total} | ${v[1].killed} | ${v[1].survived} |`);
        const total = `| Total | ${this.total} | ${this.killed} | ${this.survived} |`;
        return [headers, separator, ...rows, total].join("\n");
    }
}