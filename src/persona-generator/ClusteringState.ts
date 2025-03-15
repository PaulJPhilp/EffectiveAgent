import { Annotation } from "@langchain/langgraph"
import type { BasicClusteringResult, BasicPersona, ElaboratedPersona, NormalizedProfile, RunConfig } from "./types.js"

export const ClusteringStateAnnotation = Annotation.Root({
    runInfo: Annotation<RunConfig>(),
    normalizedProfiles: Annotation<NormalizedProfile[]>(),
    basicClusters: Annotation<BasicClusteringResult>(),
    error: Annotation<string>(),
    errorCount: Annotation<number>(),
    status: Annotation<string[]>({
        default: () => [],
        reducer: (a, b) => { a.push(b[0]); return a; },
    }),
    completedSteps: Annotation<string[]>({
        default: () => [],
        reducer: (a, b) => { a.push(b[0]); return a; }
    }),
    logs: Annotation<string[]>({
        default: () => [],
        reducer: (a, b) => {a.push(b[0]); return a;}
    }),
    currentClusterIndex: Annotation<number>(),
    currentPersona: Annotation<BasicPersona>(),
    elaboratedPersonas: Annotation<Partial<ElaboratedPersona>[]>()
})