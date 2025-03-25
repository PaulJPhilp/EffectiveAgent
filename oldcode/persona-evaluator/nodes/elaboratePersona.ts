import type { RunnableConfig } from "@langchain/core/runnables";
import { generateText } from "ai";
import { getLLM } from "../models.js";
import { getPrompt } from "../prompts/index.js";
import type { EvaluationState, ElaboratedPersona } from "../types.js";
import { validateEvaluateState, parseJsonFromMarkdown, logToRun } from "../utils.js";

export async function elaboratePersonaNode(
	state: EvaluationState,
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
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
				status: ["moving_to_next_persona"],
				logs: [...state.logs, "Moving to next persona."],
			};
		}

		// Increment the elaboration count
		const elaborationCount = (state.elaborationCount || 0) + 1;
		console.log(`Elaboration attempt ${elaborationCount}`);

		const inputPersona = state.inputPersona;
		const inputPersonaTitle = inputPersona.title;

		let prompt = getPrompt("persona-elaboration", {
			basicPersonaData: JSON.stringify(state.inputPersona, null, 2),
		});

		if (state.recommendations && state.recommendations.length !== 0) {
			prompt += `   ${state.recommendations.join("\n")}`;
		}

		// Use the model to generate text
		const { text: responseText } = await generateText({
			model: getLLM("o1-mini"),
			prompt,
		});

		console.log("Response text:", responseText);

		console.log("Parsing elaborated persona from LLM response");
		const elaboratedPersona = parseJsonFromMarkdown(
			responseText,
		) as ElaboratedPersona;

		// Log the elaborated persona for debugging
		console.log(`Elaborated persona: ${JSON.stringify(elaboratedPersona, null, 2).substring(0, 200)}...`);

		// Ensure the elaborated persona has at least the required fields
		if (!elaboratedPersona.personaName) {
			elaboratedPersona.personaName = inputPersona.title as string || "Unnamed Persona";
		}

		if (!elaboratedPersona.title) {
			elaboratedPersona.title = inputPersona.title as string || "Untitled Persona";
		}

		return {
			elaboratedPersona,
			elaborationCount,
			status: ["elaborated_persona"],
			logs: [
				...state.logs,
				`Elaborated persona ${state.inputPersona.title || "unknown"} (attempt ${elaborationCount})`,
			],
		};
	} catch (error) {
		// On error, increment error count
		const errorMsg = `Error in elaboratePersonaNode: ${error instanceof Error ? error.message : String(error)}`;
		logToRun(state.runInfo, errorMsg, "error");
		return {
			errorCount: (state.errorCount || 0) + 1,
			status: ["error"],
			error: errorMsg,
			logs: [...state.logs, errorMsg],
		};
	}
}