import type { RunnableConfig } from "@langchain/core/runnables";
import { generateText } from "ai";
import path from "path";
import { getPrompt } from "../prompts/index.js";
import type { EvaluationState } from "../types.js";
import { validateEvaluateState, logToRun } from "../utils.js";
import fs from "node:fs";

/**
 * Node 5: Create full profiles
 */
export async function createFullProfilesNode(
	state: EvaluationState,
	config: RunnableConfig,
): Promise<Partial<EvaluationState>> {
	console.log("createFullProfilesNode()");
	validateEvaluateState(state, "createFullProfilesNode()")
	// Use model from state
	const model = state.runInfo.model;

	// Update status
	const statusUpdate = {
		status: "creating_full_profiles",
		completedSteps: state.completedSteps,
		logs: [...state.logs, "Creating full profiles"],
	};

	try {


		// Verify we have elaborated personas
		if (!state.elaboratedPersona || Object.keys(state.elaboratedPersona).length === 0) {
			console.error("No elaboratedPersona found in state:", JSON.stringify(state, null, 2));
			const errorMsg = "No elaborated personas found in state";
			logToRun(state.runInfo, errorMsg, "error");
			return {
				...statusUpdate,
				status: ["error"],
				error: errorMsg,
				logs: [...state.logs, errorMsg],
			};
		}

		// Ensure elaboratedPersona has required fields
		const persona = state.elaboratedPersona;
		if (!persona.personaName || !persona.title) {
			console.error("elaboratedPersona missing required fields:", JSON.stringify(persona, null, 2));

			// Try to fill in missing fields from inputPersona if available
			if (state.inputPersona?.title) {
				persona.personaName = persona.personaName || state.inputPersona.title as string;
				persona.title = persona.title || state.inputPersona.title as string;
				console.log(`Filled in missing fields from inputPersona: ${JSON.stringify(persona, null, 2)}`);
			} else {
				return {
					...statusUpdate,
					status: ["error"],
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
			status: ["full_profiles_created"],
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
			...statusUpdate,
			status: ["error"],
			error: errorMsg,
			logs: state.logs ? [...state.logs, errorMsg] : [errorMsg],
		};
	}
}