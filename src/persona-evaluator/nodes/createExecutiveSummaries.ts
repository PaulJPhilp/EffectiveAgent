import type { RunnableConfig } from "@langchain/core/runnables";
import { generateText } from "ai";
import path from "path";
import { getPrompt } from "../prompts/index.js";
import type { EvaluationState } from "../types.js";
import { validateEvaluateState } from "../utils.js";
import fs from "node:fs";

export async function createExecutiveSummariesNode(
	state: EvaluationState,
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
	console.log("createExecutiveSummariesNode()");
	validateEvaluateState(state, "createExecutiveSummariesNode()")

	const model = state.runInfo.model;

	const statusUpdate = {
		status: "creating_executive_summaries",
		completedSteps: state.completedSteps,
		logs: [...state.logs, "Creating executive summaries"],
	};

	if (!state.elaboratedPersona || Object.keys(state.elaboratedPersona).length === 0) {
		console.error("No elaborated persona found in state:", JSON.stringify(state, null, 2).substring(0, 1000));
		return {
			...statusUpdate,
			status: ["error"],
			error: "No elaborated personas found in state",
		};
	}

	// Ensure inputPersona has required fields
	const persona = state.elaboratedPersona;
	if (!persona.personaName || !persona.title) {
		console.error("elaboratedPersona missing required fields:", JSON.stringify(persona, null, 2));

		// Try to fill in missing fields from inputPersona if available
		if (persona?.title) {
			persona.personaName = persona.personaName || persona.title;
			persona.title = persona.title;
			console.log(`Filled in missing fields from inputPersona: ${JSON.stringify(persona, null, 2)}`);
		} else {
			return {
				...statusUpdate,
				status: ["error"],
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
			status: ["executive_summaries_created"],
			executiveSummary: responseText ?? "",
			completedSteps: updatedCompletedSteps,
		};
	} catch (error) {
		console.error("[EVAL GRAPH] Error in createExecutiveSummariesNode:", error);
		return {
			...statusUpdate,
			status: ["error"],
			error: `Error creating executive summaries: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}