/**
 * Status of a mutation as reported by pitest
 * https://pitest.org/quickstart/basic_concepts/
 */
export type MutationStatus =
    | "KILLED"
    | "SURVIVED"
    | "NO_COVERAGE"
    | "TIMED_OUT"
    | "MEMORY_ERROR"
    | "RUN_ERROR"
    | "NON_VIABLE"
    | "NOT_STARTED"
    | "STARTED";

/**
 * Statuses where the mutation was detected by the tests, these count as killed (same as pitest)
 */
export const DETECTED_STATUSES: readonly MutationStatus[] = ["KILLED", "TIMED_OUT", "MEMORY_ERROR", "RUN_ERROR", "NON_VIABLE"];

/**
 * Check if the mutation was detected (killed) by the tests
 * @param mutation the mutation to check
 * @returns boolean true if the mutation was detected
 */
export function isDetected(mutation: Mutation): boolean {
    return DETECTED_STATUSES.includes(mutation.attr_status);
}

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