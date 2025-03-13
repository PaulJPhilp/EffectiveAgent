import { Annotation, StateGraph } from "@langchain/langgraph"
import { addEdges } from "../edges/index.js"
import { initializeRunNode } from "../nodes/initializeRunNode.js"
import { loadProfilesNode } from "../nodes/loadProfilesNode.js"
import { normalizeProfilesNode } from "../nodes/normalizeProfilesNode.js"
import { saveResultsNode } from "../nodes/saveResultsNode.js"
import type { NormalizationResult, NormalizationState, NormalizationStatus, NormalizationSummary, ProfileData, RunInfo } from "../types.js"

/**
 * Create and configure the normalization graph
 */
export function createNormalizationGraph() {
    const NormalizationStateAnnotation = Annotation.Root({
        runInfo: Annotation<RunInfo>(),
        status: Annotation<NormalizationStatus>(),
        profiles: Annotation<ProfileData[] | undefined>(),
        normalizedProfiles: Annotation<ProfileData[] | undefined>(),
        normalizationResults: Annotation<NormalizationResult[] | undefined>(),
        summary: Annotation<NormalizationSummary | undefined>(),
        completedSteps: Annotation<string[] | undefined>(),
        error: Annotation<string | undefined>(),
        logs: Annotation<string[] | undefined>()
    })

    const graph = new StateGraph(NormalizationStateAnnotation)

    // Register nodes
    graph.addNode("__start__", initializeRunNode)
    graph.addNode("initialize_run", initializeRunNode)
    graph.addNode("load_profiles", loadProfilesNode)
    graph.addNode("normalize_profiles", normalizeProfilesNode)
    graph.addNode("save_results", saveResultsNode)
    graph.addNode("__end__", saveResultsNode)

    // Add edges
    addEdges(graph)

    return graph.compile()
}

/**
 * Example function to run the normalization graph
 */
export async function runExample(): Promise<NormalizationState> {
    try {
        const graph = createNormalizationGraph()
        const initialState: NormalizationState = {
            runInfo: {
                runId: crypto.randomUUID(),
                startTime: new Date().toISOString(),
                outputDir: "data/normalized"
            },
            status: "initializing",
            profiles: [],
            normalizedProfiles: [],
            normalizationResults: [],
            summary: undefined,
            completedSteps: [],
            error: "",
            logs: []
        }

        const result = await graph.invoke(initialState)
        console.log("Graph execution completed:", result)
        return result as NormalizationState
    } catch (error) {
        console.error("Graph execution failed:", error)
        throw error
    }
}