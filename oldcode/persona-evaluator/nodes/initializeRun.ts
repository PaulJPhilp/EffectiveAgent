import type { RunnableConfig } from "@langchain/core/runnables";
import type { EvaluationState, RunConfig } from "../types.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getLLM } from "../models.js";
import { logToRun, saveRunMetadata, validateEvaluateState } from "../utils.js";
import chalk from "chalk"

/**
 * Node 1: Initialize run
 */
export async function initializeRunNode(
	state: EvaluationState,
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
	console.log(chalk.greenBright("initializeRunNode()"));
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
		logToRun(runInfo, `Initializing persona evaluation run: ${runId}`);
		logToRun(runInfo, `Using model: ${runInfo.model.constructor.name}`);

		// Save initial run metadata
		saveRunMetadata(runInfo);

		return {
			runInfo,
			status: ["run_initialized"],
			completedSteps: ["initialize_run"],
			logs: [`Run ${runId} initialized`],
			recommendations: [],
			elaborationCount: 0,
			elaboratedPersona: {},
		};
	} catch (error) {
		console.error("[EVAL GRAPH] Error in initializeRunNode:", error);
		return {
			status: ["error"],
			error: `Error initializing run: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

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