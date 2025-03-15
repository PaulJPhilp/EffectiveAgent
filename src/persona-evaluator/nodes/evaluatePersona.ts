import type { RunnableConfig } from "@langchain/core/runnables";
import { generateText } from "ai";
import path from "path";
import type { EvaluationState, Evaluation } from "../types.js";
import { validateEvaluateState, parseJsonFromMarkdown, logToRun } from "../utils.js";
import fs from "node:fs";
import { getPrompt } from "../prompts/index.js";
import chalk from "chalk";

/**
 * Node to evaluate a persona with error handling
 */
export async function evaluatePersonaNode(
	state: EvaluationState,
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
	console.log(chalk.greenBright("evaluatePersonaNode()"));
	validateEvaluateState(state, "evaluatePersonaNode()")

	const evaluation = state.evaluation;
	try {
		let evaluationPrompt = getPrompt("eval-persona", {
			elaboratedPersona: JSON.stringify(state.elaboratedPersona, null, 2)
		});

		// Properly stringify the elaboratedPersona object
		const elaboratedPersonaStr = JSON.stringify(state.elaboratedPersona, null, 2);
		console.log(chalk.greenBright(`Evaluating persona: ${elaboratedPersonaStr.substring(0, 200)}...`));

		evaluationPrompt += `\n\nPersona to evaluate:\n${elaboratedPersonaStr}`;

		// Use the model to generate text
		const { text: responseText } = await generateText({
			model: state.runInfo.model,
			prompt: evaluationPrompt,
		});

		const evaluationResult = parseJsonFromMarkdown(
			responseText.replaceAll("`", "").replace("json", ""),
		) as Evaluation;

		return {
			evaluation: evaluationResult,
			elaboratedPersona: state.elaboratedPersona,
			status: ["evaluated_persona"],
			logs: [...state.logs, `Evaluated persona ${state.inputPersona.title}`],
		};
	} catch (error) {
		const errorMsg = `Error in evaluatePersonaNode: ${error instanceof Error ? error.message : String(error)}`;
		logToRun(state.runInfo, errorMsg, "error");
		return {
			status: ["error"],
			error: errorMsg,
			evaluation: { answer: "no", recommendation: "" },
			logs: [...state.logs, errorMsg],
		};
	}
}