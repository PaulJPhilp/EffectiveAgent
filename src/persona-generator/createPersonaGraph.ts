import crypto from "node:crypto";
import path from "node:path";
import { getLLM } from "./models.js";
import { createClusteringGraph } from "./routes/index.js";
import type { RunConfig } from "./types.js";

// Create default run info
const runInfo: RunConfig = {
    runId: crypto.randomUUID(),
    startTime: new Date(),
    outputDir: path.join(process.cwd(), "data", "personas"),
    model: getLLM('o1-mini')
}

// Export the compiled graph
export const clusteringGraph = createClusteringGraph();

// Example of using the graph
async function runExample() {
    try {
        const result = await clusteringGraph.invoke({
            runInfo,
            normalizedProfiles: [],
            basicClusters: undefined,
            error: "",
            errorCount: 0,
            status: "",
            completedSteps: [],
            logs: [],
            currentClusterIndex: 0,
            currentPersona: undefined,
            elaboratedPersonas: []
        });
        console.log('Graph execution completed:', result);
    } catch (error) {
        console.error('Error running graph:', error);
    }
}

// Only run the example if this file is executed directly
if (require.main === module) {
    runExample().catch(console.error);
}