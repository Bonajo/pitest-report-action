export type MutationStatus = "KILLED" |"SURVIVED";

export interface Mutation {
    sourceFile: string,
    mutatedClass: string
    mutatedMethod: string
    methodDescription: string
    lineNumber: number
    mutator: string
    indexes: Array<{index: number}>
    blocks: Array<{block: number}>
    killingTest?: string
    description: string
    attr_detected: boolean
    attr_status: MutationStatus
    attr_numberOfTestsRun: number

}

export interface Mutations {
    mutation: Array<Mutation>
}

export interface Report {
    mutations: Mutations
}