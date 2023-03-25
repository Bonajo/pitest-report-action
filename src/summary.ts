import {Mutation} from "./report";
import {SummaryTableRow} from "@actions/core/lib/summary";

class SummaryStat {
    private _survived: number = 0;
    private _killed: number = 0;

    get survived(): string {
        return this._survived.toString();
    }

    get killed(): string {
        return this._killed.toString();
    }

    get total(): string {
        return (this._killed + this._survived).toString();
    }

    public increaseSurvived(): void {
        this._survived++;
    }

    public increaseKilled(): void {
        this._killed++;
    }
}

export class Summary {
    private stats = new Map<string, SummaryStat>();
    private readonly _total = new SummaryStat();

    public process(mutation: Mutation): Summary {
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

    public get killed(): string {
        return this._total.killed;
    }

    public get survived(): string {
        return this._total.survived;
    }

    public get total(): string {
        return this._total.total;
    }

    get short(): string {
        return `#Mutations: ${this.total}, KILLED: ${this.killed}, SURVIVED: ${this.survived}`;
    }

    public toSummaryTable(): SummaryTableRow[]{
        const headers = [
            {data: 'Class', header: true},
            {data: 'Mutations', header: true},
            {data: 'KILLED', header: true},
            {data: 'SURVIVED', header: true}
        ];
        const rows = Array.from(this.stats.entries())
            .map(v => [v[0], v[1].total, v[1].killed, v[1].survived]);

        rows.push(["Total", this.total, this.killed, this.survived])

        return [headers, ...rows];
    }

    public toSummaryMarkdown(): string {
        const headers: string = '| Class | Mutations | KILLED | SURVIVED |';
        const separator: string = '| --- | --- | --- | --- |';
        const rows: string[] = Array.from(this.stats.entries())
            .map(v => `| ${v[0]} | ${v[1].total} | ${v[1].killed} | ${v[1].survived} |`);
        const total = `| Total | ${this.total} | ${this.killed} | ${this.survived} |`;
        return [headers, separator, ...rows, total].join("\n");
    }
}