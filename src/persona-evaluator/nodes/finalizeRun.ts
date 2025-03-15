import type { RunnableConfig } from "@langchain/core/runnables";
import path from "path";
import type { EvaluationState } from "../types.js";
import { logToRun, saveRunMetadata } from "../utils.js";
import fs from "node:fs";
import chalk from "chalk";

/**
 * Node to finalize the run and update metadata
 */
export async function finalizeRunNode(
	state: EvaluationState,	
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
	console.log(chalk.greenBright("finalizeRun()"))
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
			status: ["run_completed"],
			completedSteps: [...state.completedSteps, "finalize_run"],
			logs: [...state.logs, successMsg, `Run summary saved to ${summaryPath}`],
		};
	} catch (error) {
		const errorMsg = `Error finalizing run: ${error instanceof Error ? error.message : String(error)}`;
		logToRun(state.runInfo, errorMsg, "error");
		return {
			status: ["error"],
			error: errorMsg,
			logs: [...(state.logs || []), errorMsg],
		};
	}
}
