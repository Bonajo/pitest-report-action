interface Mutation {
    sourceFile: string,
    mutatedClass: string
    mutatedMethod: string
    methodDescription: string
    lineNumber: number
    mutator: string
    indexes: Array<{index: number}>
    blocks: Array<{block: number}>
    killingTest: string
    description: string
    attr_detected: boolean
    attr_status: "KILLED" |"SURVIVED"
    attr_numberOfTestsRun: number

}

interface Mutations {
    mutation: Array<Mutation>
}

interface Report {
    mutations: Mutations
}