import crypto from "node:crypto";
import path from "node:path";
import { getLLM, buildModelRegistry } from "./models.js";
import type { RunConfig } from "./types.js";
import { END, START, StateGraph, Annotation } from "@langchain/langgraph";

import { ClusteringStateAnnotation } from "./ClusteringState.js";
import { initializeRunNode } from "./nodes/initializeRunNode.js";
import { collectPersonaResultsNode } from "./nodes/collectPersonaResultsNode.js"
import { createBasicClustersNode } from "./nodes/createBasicClustersNode.js"
import { loadNormalizedProfilesNode } from "./nodes/loadNormalizedProfilesNode.js"
import { processBaseClustersNode } from "./nodes/processBaseClustersNode.js"

// Create default run info
const runInfo: RunConfig = {
    runId: crypto.randomUUID(),
    startTime: new Date(),
    outputDir: path.join(process.cwd(), "data", "personas"),
    model: getLLM('o1-mini')
}

const clusteringGraphBuilder = new StateGraph(ClusteringStateAnnotation)

    .addNode("initializeRunNode", initializeRunNode)
    .addEdge(START, "initializeRunNode")

    .addNode("loadNormalizedProfilesNode", loadNormalizedProfilesNode)
    .addEdge("initializeRunNode", "loadNormalizedProfilesNode")

    .addNode("createBasicClustersNode", createBasicClustersNode)
    .addEdge("loadNormalizedProfilesNode", "createBasicClustersNode")

    .addNode("processBaseClustersNode", processBaseClustersNode)
    .addEdge("createBasicClustersNode", "processBaseClustersNode")

    //.addNode("collectPersonaResultsNode", collectPersonaResultsNode)
    //.addEdge("processBaseClustersNode", "collectPersonaResultsNode")

    .addEdge("processBaseClustersNode", END);

export const clusteringGraph = clusteringGraphBuilder.compile();

// Example of using the graph
export async function ClusteringAgent() {
    try {
        buildModelRegistry()
        const result = await clusteringGraph.invoke({
            runInfo,
            normalizedProfiles: [],
            basicClusters: undefined,
            error: "",
            errorCount: 0,
            status: [],
            completedSteps: [],
            logs: [],
            currentClusterIndex: 0,
            currentPersona: undefined,
            elaboratedPersonas: []
        });
        //console.log('Graph execution completed:', result);
    } catch (error) {
        console.error('Error running graph:', error);
    }
}

// Only run the example if this file is executed directly
if (require.main === module) {
    ClusteringAgent().catch(console.error);
}