export type MutationStatus = "KILLED" |"SURVIVED";

export interface Mutation {
    sourceFile: string,
    mutatedClass: string
    mutatedMethod: string
    methodDescription?: string
    lineNumber: number
    mutator: string
    indexes?: Array<{index: number}>
    blocks?: Array<{block: number}>
    killingTest?: string
    description?: string
    attr_detected?: boolean
    attr_status: MutationStatus
    attr_numberOfTestsRun?: number
}

export interface XMLMutations {
    mutation: Array<Mutation>
}

export interface XMLReport{
    mutations: XMLMutations
}

export class Report {
    static readonly supportedTypes = ["XML", "CSV"];
    private readonly _type: typeof Report.supportedTypes[number];
    private readonly _path: string;
    private readonly _mutations: Array<Mutation>;

    public constructor(type: string, path: string, mutations: Mutation[]) {
        this._type = type;
        this._path = path;
        this._mutations = mutations;
    }

    public get type(): string {
        return this._type;
    }

    public get path(): string {
        return this._path;
    }

    public get mutations(): Mutation[] {
        return this._mutations;
    }
}