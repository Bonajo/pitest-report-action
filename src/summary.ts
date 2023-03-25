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
        return this._killed + this._survived.toString();
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
    private readonly total = new SummaryStat();

    public process(mutation: Mutation): Summary {
        if(!this.stats.has(mutation.mutatedClass)){
            this.stats.set(mutation.mutatedMethod, new SummaryStat());
        }
        const stat = this.stats.get(mutation.mutatedClass);
        if(mutation.attr_status === "KILLED"){
            stat?.increaseKilled()
            this.total.increaseKilled();
        }else{
            stat?.increaseSurvived();
            this.total.increaseSurvived();
        }
        return this;
    }

    public get killed(): string {
        return this.total.killed;
    }

    public get survived(): string {
        return this.total.survived;
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

        rows.push(["Total", this.total.total, this.total.killed, this.total.survived])

        return [headers, ...rows];
    }
}