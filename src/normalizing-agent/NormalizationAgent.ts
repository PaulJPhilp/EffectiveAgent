import { Annotation, END, START, StateGraph } from "@langchain/langgraph"
import { addEdges } from "./edges/index.js"
import { initializeRunNode } from "./nodes/initializeRunNode.js"
import { loadProfilesNode } from "./nodes/loadProfilesNode.js"
import { normalizeProfilesNode } from "./nodes/normalizeProfilesNode.js"
import { saveResultsNode } from "./nodes/saveResultsNode.js"
import type { NormalizationStatus, NormalizationSummary, ProfileData, RunInfo } from "./types.js"
import { NormalizationStateAnnotation,type NormalizationState } from "./NormalizationState.js"
import { buildModelRegistry } from "./models.js"
import type { Document } from "@langchain/core/documents"

/**
 * Create and configure the normalization graph
 */
export function createNormalizationGraph() {
    // Define state annotation
    const graph = new StateGraph(NormalizationStateAnnotation)
        
        .addNode("initializeRun", initializeRunNode)
        .addEdge(START, "initializeRun")

        .addNode("load_profiles", loadProfilesNode)
        .addEdge("initializeRun", "load_profiles")

        .addNode("normalize_profiles", normalizeProfilesNode)
        .addEdge("load_profiles", "normalize_profiles")

        .addNode("save_results", saveResultsNode)
        .addEdge("normalize_profiles", "save_results")

        .addEdge("save_results", END)

    return graph.compile()
}

export async function NormalizeAgent() {
    try {
        buildModelRegistry()
        const NormalizeGraph = createNormalizationGraph()
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
            summary: {
                totalProfiles: 0,
                successfulNormalizations: 0,
                failedNormalizations: 0,
                errors: []
            },
            completedSteps: [],
            error: "",
            errorCount: 0,
            logs: [] as Array<string>
        }

        const result = await NormalizeGraph.invoke(initialState)
        console.log('Graph execution completed:');
    } catch (error) {
        console.error('Error running graph:', error);
    }
}

// Only run the example if this file is executed directly
if (require.main === module) {
    NormalizeAgent().catch(console.error);
}