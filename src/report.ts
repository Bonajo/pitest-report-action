// A mutation is either KILLED or it SURVIVED
export type MutationStatus = "KILLED" |"SURVIVED";

/**
 * Mutation as parsed by the XML parser
 * Some fields are optional, as these are missing from the CSV mutation report
 */
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

/**
 * Class to unify different types of mutation reports
 */
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