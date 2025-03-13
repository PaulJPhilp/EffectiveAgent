import { Annotation, StateGraph } from "@langchain/langgraph"
import { addEdges } from "../edges/index.js"
import { collectPersonaResultsNode } from "../nodes/collectPersonaResultsNode.js"
import { createBasicClustersNode } from "../nodes/createBasicClustersNode.js"
import { initializeRunNode } from "../nodes/initializeRunNode.js"
import { loadNormalizedProfilesNode } from "../nodes/loadNormalizedProfilesNode.js"
import { processBaseClustersNode } from "../nodes/processBaseClustersNode.js"
import type { BasicClusteringResult, BasicPersona, ElaboratedPersona, NormalizedProfile, RunConfig } from "../types.js"

/**
 * Create the clustering graph with all nodes and edges
 */
export function createClusteringGraph() {
    const ClusteringStateAnnotation = Annotation.Root({
        runInfo: Annotation<RunConfig>,
        normalizedProfiles: Annotation<NormalizedProfile[]>,
        basicClusters: Annotation<BasicClusteringResult>,
        error: Annotation<string>,
        errorCount: Annotation<number>,
        status: Annotation<string>,
        completedSteps: Annotation<string[]>,
        logs: Annotation<string[]>,
        currentClusterIndex: Annotation<number>,
        currentPersona: Annotation<BasicPersona>,
        elaboratedPersonas: Annotation<Partial<ElaboratedPersona>[]>
    })

    const graph = new StateGraph(ClusteringStateAnnotation)
        .addNode("initializeRun", initializeRunNode)
        .addNode("loadNormalizedProfiles", loadNormalizedProfilesNode)
        .addNode("createBasicClusters", createBasicClustersNode)
        .addNode("processBaseClusters", processBaseClustersNode)
        .addNode("collectPersonaResults", collectPersonaResultsNode)

    // Add edges to the graph
    addEdges(graph)

    return graph.compile()
} 