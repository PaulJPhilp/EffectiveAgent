import type { RunnableConfig } from "@langchain/core/runnables";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { generateText, type LanguageModelV1 } from "ai";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getLLM } from "./models.js";
import { getPrompt } from "./prompts/index.js";
import type {
    ElaboratedPersona,
    Evaluation,
    EvaluationState,
    FullPersona
} from "./types.js";
import { logToRun, parseJsonFromMarkdown, saveRunMetadata, validateEvaluateState } from "./utils.js";

// Run configuration to track run-specific information
interface RunConfig {
    runId: string;
    startTime: Date;
    model: LanguageModelV1;
    description?: string;
    outputDir: string;
    endTime?: Date;
}

const runInfo: RunConfig = {
    runId: crypto.randomUUID(),
    startTime: new Date(),
    outputDir: path.join(process.cwd(), "data", "personas"),
    model: getLLM("o1-mini"),
};

// Create run-specific directories
function setupRunDirectories(runId: string): string {
    const baseDir = path.join(process.cwd(), "data", "personas", "runs", runId);

    // Create main run directory
    fs.mkdirSync(baseDir, { recursive: true });

    // Create subdirectories for different outputs
    const dirs = ["executive-summary", "full-profile", "eval-logs", "logs"];

    for (const dir of dirs) {
        fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    }

    return baseDir;
}
// Define the types for state updates
type EvaluationStateUpdate = Partial<EvaluationState>;



async function initializeRunNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("initializeRunNode()");
    validateEvaluateState(state, "initializeRunNode()")

    try {
        // Generate a unique run ID (timestamp + random chars)
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const randomChars = crypto.randomBytes(4).toString("hex");
        const runId = `run-${timestamp}-${randomChars}`;

        // Set up run directories
        const outputDir = setupRunDirectories(runId);

        // Create run info
        const runInfo: RunConfig = {
            runId,
            startTime: new Date(),
            outputDir,
            model: getLLM("o1-mini"),
        };

        // Log run initialization
        logToRun(runInfo, `Initializing persona generation run: ${runId}`);
        logToRun(runInfo, `Using model: ${runInfo.model.constructor.name}`);

        // Save initial run metadata
        saveRunMetadata(runInfo);

        return {
            runInfo,
            status: "run_initialized",
            completedSteps: ["initialize_run"],
            logs: [`Run ${runId} initialized`],
            recommendations: [],
            elaborationCount: 0,
            elaboratedPersona: {},
        };
    } catch (error) {
        console.error("[EVAL GRAPH] Error in initializeRunNode:", error);
        return {
            status: "error",
            error: `Error initializing run: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}


function routeAfterEvaluation(
    // biome-ignore lint/suspicious/noExplicitAny: Required for LangGraph compatibility
    state: Record<string, any>
): "elaboratePersona" | "createExecutiveSummaries" | "__end__" {
    console.log(`routeAfterEvaluation: evaluation=${JSON.stringify(state.evaluation)}`);

    // Get the current elaboration count
    const elaborationCount = state.elaborationCount || 0;

    // If we've reached the maximum number of elaboration attempts, move on
    if (elaborationCount >= 3) {
        console.log(`Maximum elaboration attempts (${elaborationCount}) reached, moving to createExecutiveSummaries`);
        return "createExecutiveSummaries";
    }

    if (state.evaluation?.answer === "yes") {
        console.log("Routing to createExecutiveSummaries");
        return "createExecutiveSummaries";
    }

    console.log(`Routing to elaboratePersona (attempt ${elaborationCount + 1})`);
    return "elaboratePersona";
}

async function elaboratePersonaNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("elaboratePersonaNode()");
    validateEvaluateState(state, "elaboratePersonaNode()")

    try {
        const errorCount = state.errorCount;
        if (errorCount >= 3) {
            // If we've hit error limit or max elaboration attempts, move to next persona
            console.log(
                `[ELABORATE] Moving to next persona due to limits: errors=${errorCount}`,
            );
            // Return updated state with incremented index and reset counters
            return {
                errorCount: 0,
                recommendations: [],
                status: "moving_to_next_persona",
                logs: [...state.logs, "Moving to next persona."],
            };
        }

        // Increment the elaboration count
        const elaborationCount = (state.elaborationCount || 0) + 1;
        console.log(`Elaboration attempt ${elaborationCount}`);

        const currentPersona = state.currentPersona;
        const currentPersonaTitle = currentPersona.title;

        let prompt = getPrompt("persona-elaboration", {
            normalizedProfilesData: JSON.stringify(state.currentPersona, null, 2),
        });

        if (state.recommendations && state.recommendations.length !== 0) {
            prompt += `   ${state.recommendations.join("\n")}`;
        }

        // Use the model to generate text
        const { text: responseText } = await generateText({
            model: getLLM("o1-mini"),
            prompt,
        });

        console.log("Parsing elaborated persona from LLM response");
        const elaboratedPersona = parseJsonFromMarkdown(
            responseText,
        ) as ElaboratedPersona;

        // Log the elaborated persona for debugging
        console.log(`Elaborated persona: ${JSON.stringify(elaboratedPersona, null, 2).substring(0, 200)}...`);

        // Ensure the elaborated persona has at least the required fields
        if (!elaboratedPersona.personaName) {
            elaboratedPersona.personaName = currentPersona.title as string || "Unnamed Persona";
        }

        if (!elaboratedPersona.title) {
            elaboratedPersona.title = currentPersona.title as string || "Untitled Persona";
        }

        return {
            elaboratedPersona,
            elaborationCount,
            status: "elaborated_persona",
            logs: [
                ...state.logs,
                `Elaborated persona ${state.currentPersona.title || "unknown"} (attempt ${elaborationCount})`,
            ],
        };
    } catch (error) {
        // On error, increment error count
        const errorMsg = `Error in elaboratePersonaNode: ${error instanceof Error ? error.message : String(error)}`;
        logToRun(state.runInfo, errorMsg, "error");
        return {
            errorCount: (state.errorCount || 0) + 1,
            status: "error",
            error: errorMsg,
            logs: [...state.logs, errorMsg],
        };
    }
}

/**
 * Node to evaluate a persona with error handling
 */
async function evaluatePersonaNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("evaluatePersonaNode()");
    validateEvaluateState(state, "evaluatePersonaNode()")

    const evaluation = state.evaluation;
    try {
        const evaluationPromptPath = path.join(
            __dirname,
            "prompts/templates/eval-persona.txt",
        );
        let evaluationPrompt = fs.readFileSync(evaluationPromptPath, {
            encoding: "utf-8",
        });

        // Properly stringify the elaboratedPersona object
        const elaboratedPersonaStr = JSON.stringify(state.elaboratedPersona, null, 2);
        console.log(`Evaluating persona: ${elaboratedPersonaStr.substring(0, 200)}...`);

        evaluationPrompt = `${evaluationPrompt}\n\nPersona to evaluate:\n${elaboratedPersonaStr}`;

        // Use the model to generate text
        const { text: responseText } = await generateText({
            model: state.runInfo.model,
            prompt: evaluationPrompt,
        });
        // console.log(responseText)
        const evaluationResult = parseJsonFromMarkdown(
            responseText.replaceAll("`", "").replace("json", ""),
        ) as Evaluation;

        return {
            evaluation: evaluationResult,
            elaboratedPersona: state.elaboratedPersona,
            status: "evaluated_persona",
            logs: [...state.logs, `Evaluated persona ${state.currentPersona.title}`],
        };
    } catch (error) {
        const errorMsg = `Error in evaluatePersonaNode: ${error instanceof Error ? error.message : String(error)}`;
        logToRun(state.runInfo, errorMsg, "error");
        return {
            status: "error",
            error: errorMsg,
            evaluation: { answer: "no", recommendation: "" },
            logs: [...state.logs, errorMsg],
        };
    }
}

async function createExecutiveSummariesNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("createExecutiveSummariesNode()");
    validateEvaluateState(state, "createExecutiveSummariesNode()")

    const model = state.runInfo.model;

    const statusUpdate = {
        status: "creating_executive_summaries",
        completedSteps: state.completedSteps ? [...state.completedSteps] : [],
        logs: [...state.logs, "Creating executive summaries"],
    };

    if (!state.elaboratedPersona || Object.keys(state.elaboratedPersona).length === 0) {
        console.error("No elaboratedPersona found in state:", JSON.stringify(state, null, 2).substring(0, 500));
        return {
            ...statusUpdate,
            status: "error",
            error: "No elaborated personas found in state",
        };
    }

    // Ensure elaboratedPersona has required fields
    const persona = state.elaboratedPersona;
    if (!persona.personaName || !persona.title) {
        console.error("elaboratedPersona missing required fields:", JSON.stringify(persona, null, 2));

        // Try to fill in missing fields from currentPersona if available
        if (state.currentPersona?.title) {
            persona.personaName = persona.personaName || state.currentPersona.title as string;
            persona.title = persona.title || state.currentPersona.title as string;
            console.log(`Filled in missing fields from currentPersona: ${JSON.stringify(persona, null, 2)}`);
        } else {
            return {
                ...statusUpdate,
                status: "error",
                error: "Elaborated persona missing required fields",
            };
        }
    }

    console.log(
        `[EVAL GRAPH] Creating executive summaries for ${persona.title} personas`,
    );

    // Create executive summaries for each persona
    const executiveSummaries: Record<string, string> = {};
    const updatedCompletedSteps = state.completedSteps;

    try {
        console.log(
            `[EVAL GRAPH] Creating executive summary for ${persona.personaName}`,
        );

        // Define the prompt for executive summary
        const prompt = getPrompt("executive-summary", {
            personaData: JSON.stringify(persona, null, 2),
            personaName: persona.personaName ?? "Unnamed Persona",
            personaTitle: persona.title ?? "Untitled",
        });

        // Use the model to generate text
        const { text: responseText } = await generateText({
            model,
            prompt,
        });

        // Save the executive summary
        const outputDir = path.join(
            process.cwd(),
            "data",
            "personas",
            "executive-summary",
        );
        fs.mkdirSync(outputDir, { recursive: true });
        const safeFileName = persona.personaName ?? "personaName"
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");
        const outputPath = path.join(outputDir, `${safeFileName}.md`);
        fs.writeFileSync(outputPath, responseText);

        console.log(
            `[EVAL GRAPH] Successfully created executive summary for ${persona.personaName}`,
        );
        console.log(`[EVAL GRAPH] Saved to ${outputPath}`);

        updatedCompletedSteps.push(`executive_summary_${safeFileName}`);

        return {
            ...statusUpdate,
            status: "executive_summaries_created",
            executiveSummary: responseText ?? "",
            elaboratedPersona: persona,
            completedSteps: updatedCompletedSteps,
        };
    } catch (error) {
        console.error("[EVAL GRAPH] Error in createExecutiveSummariesNode:", error);
        return {
            status: "error",
            error: `Error creating executive summaries: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

/**
 * Node 5: Create full profiles
 */
async function createFullProfilesNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("createFullProfilesNode()");
    validateEvaluateState(state, "createFullProfilesNode()")

    try {
        // Use model from state
        const model = state.runInfo.model;

        // Update status
        const statusUpdate = {
            status: "creating_full_profiles",
            completedSteps: state.completedSteps,
            logs: [...state.logs, "Creating full profiles"],
        };

        // Verify we have elaborated personas
        if (!state.elaboratedPersona || Object.keys(state.elaboratedPersona).length === 0) {
            console.error("No elaboratedPersona found in state:", JSON.stringify(state, null, 2).substring(0, 500));
            const errorMsg = "No elaborated personas found in state";
            logToRun(state.runInfo, errorMsg, "error");
            return {
                ...statusUpdate,
                status: "error",
                error: errorMsg,
                logs: [...state.logs, errorMsg],
            };
        }

        // Ensure elaboratedPersona has required fields
        const persona = state.elaboratedPersona;
        if (!persona.personaName || !persona.title) {
            console.error("elaboratedPersona missing required fields:", JSON.stringify(persona, null, 2));

            // Try to fill in missing fields from currentPersona if available
            if (state.currentPersona?.title) {
                persona.personaName = persona.personaName || state.currentPersona.title as string;
                persona.title = persona.title || state.currentPersona.title as string;
                console.log(`Filled in missing fields from currentPersona: ${JSON.stringify(persona, null, 2)}`);
            } else {
                return {
                    ...statusUpdate,
                    status: "error",
                    error: "Elaborated persona missing required fields",
                };
            }
        }

        logToRun(
            state.runInfo,
            `Creating full profiles for ${persona.title} personas`,
        );

        // Create full profiles for each persona
        const fullProfiles = "";
        const updatedCompletedSteps = state.completedSteps;

        logToRun(state.runInfo, `Creating full profile for ${persona.personaName}`);

        // Define the prompt for full profile
        const prompt = getPrompt("full-profile", {
            personaData: JSON.stringify(persona, null, 2),
            personaName: persona.personaName ?? "personaName",
            personaTitle: persona.title ?? "title",
        });

        const { text: responseText } = await generateText({
            model,
            prompt,
            maxTokens: 4096,
        });

        // Save the full profile
        const outputDir = path.join(state.runInfo.outputDir, "full-profile");
        fs.mkdirSync(outputDir, { recursive: true });
        const safeFileName = persona.personaName ?? "personaName"
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");
        const outputPath = path.join(outputDir, `${safeFileName}.md`);
        fs.writeFileSync(outputPath, responseText);

        const successMsg = `Successfully created full profile for ${persona.personaName}`;
        logToRun(state.runInfo, successMsg);
        logToRun(state.runInfo, `Saved to ${outputPath}`);

        // Add to the full profiles
        const fullProfile = responseText;
        updatedCompletedSteps.push(`full_profile_${safeFileName}`);

        return {
            ...statusUpdate,
            status: "full_profiles_created",
            fullProfile,
            elaboratedPersona: persona,
            completedSteps: updatedCompletedSteps,
            logs: state.logs
                ? [
                    ...state.logs,
                    `Created ${Object.keys(fullProfiles).length} full profiles`,
                ]
                : [`Created ${Object.keys(fullProfiles).length} full profiles`],
        };
    } catch (error) {
        const errorMsg = `Error in createFullProfilesNode: ${error instanceof Error ? error.message : String(error)}`;
        logToRun(state.runInfo, errorMsg, "error");
        return {
            status: "error",
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg],
        };
    }
}

const EvaluationStateAnnotation = Annotation.Root({
    runInfo: Annotation<RunConfig>,
    currentPersona: Annotation<Partial<FullPersona>>,
    elaboratedPersona: Annotation<Partial<ElaboratedPersona>>,
    elaborationCount: Annotation<number>,
    evaluation: Annotation<Evaluation>,
    executiveSummaries: Annotation<Record<string, string>>,
    fullProfiles: Annotation<Record<string, string>>,
    summaryReport: Annotation<string>,
    error: Annotation<string>,
    errorCount: Annotation<number>,
    status: Annotation<string>,
    completedSteps: Annotation<string[]>,
    logs: Annotation<string[]>,
    recommendations: Annotation<string[]>,
});

export const evaluatePersonaGraph = new StateGraph(EvaluationStateAnnotation)
    .addNode("initializeRun", initializeRunNode)
    .addNode("elaboratePersona", elaboratePersonaNode)
    .addNode("evaluatePersona", evaluatePersonaNode)
    .addNode("createExecutiveSummaries", createExecutiveSummariesNode)
    .addNode("createFullProfiles", createFullProfilesNode)
    .addEdge("__start__", "initializeRun")
    .addEdge("initializeRun", "elaboratePersona")
    .addEdge("elaboratePersona", "evaluatePersona")
    // Use conditional routing after evaluation
    .addConditionalEdges("evaluatePersona", routeAfterEvaluation, [
        "elaboratePersona",
        "createExecutiveSummaries",
        "__end__",
    ])
    .addEdge("createExecutiveSummaries", "createFullProfiles")
    .addEdge("createFullProfiles", "__end__")
    .compile();

/**
 * Node to finalize the run and update metadata
 */
async function finalizeRunNode(
    state: EvaluationState,
    config: RunnableConfig,
): Promise<EvaluationStateUpdate> {
    console.log("finalizeRun()");
    try {
        logToRun(state.runInfo, "Finalizing run");

        // Update the run metadata with completion information
        saveRunMetadata({
            ...state.runInfo,
        });

        const indexContent = {
            runId: state.runInfo.runId,
            startTime: state.runInfo.startTime,
            endTime: new Date(),
            personas: state.elaboratedPersona,
        };

        const indexPath = path.join(state.runInfo.outputDir, "personas.json");
        fs.writeFileSync(indexPath, JSON.stringify(indexContent, null, 2));

        logToRun(state.runInfo, `Created personas index at ${indexPath}`);

        // Create a summary of the run
        const runSummary = {
            runId: state.runInfo.runId,
            startTime: state.runInfo.startTime,
            endTime: new Date(),
            model: state.runInfo.model.constructor.name,
            personaName: state.elaboratedPersona,
        };

        const summaryPath = path.join(state.runInfo.outputDir, "run-summary.json");
        fs.writeFileSync(summaryPath, JSON.stringify(runSummary, null, 2));

        const successMsg = `Run ${state.runInfo.runId} completed successfully!`;
        logToRun(state.runInfo, successMsg);

        return {
            status: "run_completed",
            completedSteps: [...state.completedSteps, "finalize_run"],
            logs: [...state.logs, successMsg, `Run summary saved to ${summaryPath}`],
        };
    } catch (error) {
        const errorMsg = `Error finalizing run: ${error instanceof Error ? error.message : String(error)}`;
        logToRun(state.runInfo, errorMsg, "error");
        return {
            status: "error",
            error: errorMsg,
            logs: [...(state.logs || []), errorMsg],
        };
    }
}
