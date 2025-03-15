import type { EvaluationState } from "./types.js";
import { initializeRunNode } from "./nodes/initializeRun.js";
import { finalizeRunNode } from "./nodes/finalizeRun.js";
import { EvaluationStateAnnotation } from "./EvaluationState.js";
import { routeAfterEvaluation } from "./routes/routeAfterEvaluation.js";
import { evaluatePersonaNode } from "./nodes/evaluatePersona.js";
import { createExecutiveSummariesNode } from "./nodes/createExecutiveSummaries.js";
import { createFullProfilesNode } from "./nodes/createFullProfiles.js";
import type { LanguageModelV1 } from "ai";
import { StateGraph } from "@langchain/langgraph";
import { buildModelRegistry } from "./models.js";
import crypto from "node:crypto";
import path from "node:path";
import { getLLM } from "./models.js";
import { elaboratePersonaNode } from "./nodes/elaboratePersona.js";

// Run configuration to track run-specific information
interface RunConfig {
    runId: string;
    startTime: Date;
    model: LanguageModelV1;
    description?: string;
    outputDir: string;
    endTime?: Date;
}

const runId = crypto.randomUUID();

const runInfo: RunConfig = {
    runId,
    startTime: new Date(),
    model: getLLM('o1-mini'),
    outputDir: path.join(process.cwd(), "data", "personas", "runs", runId),
};

// Define the types for state updates
type EvaluationStateUpdate = Partial<EvaluationState>;

export const EvaluatePersonaGraph = new StateGraph(EvaluationStateAnnotation)
    
    .addNode("initializeRun", initializeRunNode)
    .addEdge("__start__", "initializeRun")

    .addNode("elaboratePersona", elaboratePersonaNode)
    .addEdge("initializeRun", "elaboratePersona")

    .addNode("evaluatePersona", evaluatePersonaNode)
    .addEdge("elaboratePersona", "evaluatePersona")

    .addNode("createExecutiveSummaries", createExecutiveSummariesNode)
    .addEdge("evaluatePersona", "createExecutiveSummaries")

    .addNode("createFullProfiles", createFullProfilesNode)
    .addEdge("createExecutiveSummaries", "createFullProfiles")

    .addNode("finalizeRun", finalizeRunNode)
    .addEdge("createFullProfiles", "finalizeRun")


    // Use conditional routing after evaluation
    .addConditionalEdges("evaluatePersona", routeAfterEvaluation, [
        "elaboratePersona",
        "createExecutiveSummaries",
        "finalizeRun",
    ])

    .addEdge("finalizeRun", "__end__")
    .compile();

// Example of using the graph
export async function EvaluatePersonaAgent() {
    try {
        buildModelRegistry()
        const result = await EvaluatePersonaGraph.invoke({
            runInfo,
            error: "",
            errorCount: 0,
            status: [],
            completedSteps: [],
            logs: []
        });
        //console.log('Graph execution completed:', result);
    } catch (error) {
        console.error('Error running graph:', error);
    }
}

// Only run the example if this file is executed directly
if (require.main === module) {
    EvaluatePersonaAgent().catch(console.error);
}