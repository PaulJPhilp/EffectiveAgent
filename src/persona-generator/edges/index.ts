import { Send, type StateGraph } from "@langchain/langgraph"
import type { ClusteringState } from "../types.js"

/**
 * Add edges to the persona generation graph
 */
export function addEdges(graph: StateGraph<ClusteringState>): void {
    // Define possible nodes
    const nodes = {
        "__start__": "__start__",
        "initializeRun": "__start__",
        "loadNormalizedProfiles": "__start__",
        "createBasicClusters": "__start__",
        "processBaseClusters": "__start__",
        "collectPersonaResults": "__start__",
        "__end__": "__end__"
    } as const

    // Define routing function
    function routeNext(state: ClusteringState) {
        const steps = {
            "__start__": "initializeRun",
            "initializeRun": "loadNormalizedProfiles",
            "loadNormalizedProfiles": "createBasicClusters",
            "createBasicClusters": "processBaseClusters",
            "processBaseClusters": "collectPersonaResults",
            "collectPersonaResults": "__end__"
        } as const

        const currentStep = state.status
        return new Send(steps[currentStep as keyof typeof steps], state)
    }

    // Add conditional edges for routing
    graph.addConditionalEdges(
        "__start__",
        routeNext,
        nodes
    )
} 