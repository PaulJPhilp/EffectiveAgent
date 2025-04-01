// File: scripts/validate-configs.ts (or test/config-validator.ts)

import fs from 'node:fs';
import path from 'node:path';
import { z, ZodError } from 'zod';

// --- Import Schemas (Adjust paths as needed) ---
import { ProvidersFileSchema, type ProvidersFile } from '../src/services/provider/schemas/providerConfig.js';
import { ModelConfigFileSchema, type ModelConfigFile } from '../src/services/model/schemas/modelConfig.js';
import { PromptConfigFileSchema, type PromptConfigFile } from '../src/services/prompt/schemas/promptConfig.js';
import { TaskConfigFileSchema, type TaskConfigFile } from '../src/services/task/schemas/taskConfig.js'; // Using Task for now

// --- Helper Functions ---

function formatZodError(error: ZodError, filePath: string): string[] {
	return error.errors.map(e => `Schema Error in ${path.basename(filePath)} at [${e.path.join('.') || '<root>'}]: ${e.message}`);
}

interface ValidationReport {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	checkedFiles: string[];
}

/**
 * Loads, parses, and validates a single JSON configuration file against a Zod schema.
 * Adds errors to the provided errors array if any step fails.
 * @returns The validated data object or null if an error occurred.
 */
function loadAndValidate<T>(
	filePath: string,
	schema: z.ZodType<T>,
	errors: string[],
	checkedFiles: string[]
): T | null {
	checkedFiles.push(filePath);
	let content: string;
	let parsedJson: unknown;

	// 1. Read File
	try {
		content = fs.readFileSync(filePath, 'utf8');
	} catch (error: any) {
		errors.push(`Failed to read file "${filePath}": ${error.message}`);
		return null;
	}

	// 2. Parse JSON
	try {
		parsedJson = JSON.parse(content);
	} catch (error: any) {
		errors.push(`Failed to parse JSON in file "${filePath}": ${error.message}`);
		return null;
	}

	// 3. Validate Schema
	const result = schema.safeParse(parsedJson);
	if (!result.success) {
		errors.push(...formatZodError(result.error, filePath));
		return null;
	}

	// Success
	return result.data;
}

/**
 * Performs cross-file configuration validation checks.
 */
function performCrossChecks(
	providersData: ProvidersFile | null,
	modelsData: ModelConfigFile | null,
	promptsData: PromptConfigFile | null,
	tasksData: TaskConfigFile | null, // Using Task for now
	errors: string[],
	warnings: string[]
): void {
	console.log('\nPerforming cross-reference checks...');

	// --- Model -> Provider Checks ---
	if (providersData && modelsData) {
		const providerNames = new Set(providersData.providers.map(p => p.name));
		modelsData.models.forEach(model => {
			if (!providerNames.has(model.provider)) {
				errors.push(`Model "${model.id}" references unknown provider "${model.provider}". Valid providers: [${Array.from(providerNames).join(', ')}]`);
			}
		});
		console.log(`- Checked ${modelsData.models.length} models against ${providerNames.size} providers.`);
	} else {
		warnings.push("Skipping Model -> Provider checks due to loading/validation errors in providers.json or models.json.");
	}

	// --- Task -> Model Checks ---
	if (tasksData && modelsData) {
		const modelIds = new Set(modelsData.models.map(m => m.id));
		tasksData.tasks.forEach(task => {
			// Check primary model
			if (!modelIds.has(task.primaryModelId)) {
				errors.push(`Task "${task.taskName}" references unknown primaryModelId "${task.primaryModelId}".`);
			}
			// Check fallback models
			task.fallbackModelIds?.forEach(fallbackId => {
				if (!modelIds.has(fallbackId)) {
					errors.push(`Task "${task.taskName}" references unknown fallbackModelId "${fallbackId}".`);
				}
			});
		});
		console.log(`- Checked ${tasksData.tasks.length} tasks against ${modelIds.size} models.`);
	} else {
		warnings.push("Skipping Task -> Model checks due to loading/validation errors in tasks.json or models.json.");
	}

	// --- Task -> Prompt Checks ---
	if (tasksData && promptsData) {
		// Assuming promptsData.prompts is an array as per schema
		const promptIds = new Set(promptsData.prompts.map(p => p.id));
		tasksData.tasks.forEach(task => {
			if (!promptIds.has(task.promptName)) {
				errors.push(`Task "${task.taskName}" references unknown promptName "${task.promptName}".`);
			}
		});
		console.log(`- Checked ${tasksData.tasks.length} tasks against ${promptIds.size} prompts.`);
	} else {
		warnings.push("Skipping Task -> Prompt checks due to loading/validation errors in tasks.json or prompts.json.");
	}

	console.log('Cross-reference checks complete.');
}


/**
 * Main validation function.
 * @param sharedConfigDir Path to the directory containing shared configs (providers.json, models.json).
 * @param agentConfigDir Path to the directory containing agent-specific configs (prompts.json, tasks.json).
 */
export function validateAllConfigs(sharedConfigDir: string, agentConfigDir: string): ValidationReport {
	const errors: string[] = [];
	const warnings: string[] = [];
	const checkedFiles: string[] = [];

	console.log(`Starting configuration validation...`);
	console.log(`Shared Config Directory: ${sharedConfigDir}`);
	console.log(`Agent Config Directory: ${agentConfigDir}`);
	console.log('---');

	// --- Load and Validate Individual Files ---
	const providersData = loadAndValidate<ProvidersFile>(
		path.join(sharedConfigDir, 'providers.json'),
		ProvidersFileSchema,
		errors,
		checkedFiles
	);
	console.log(`Checked providers.json: ${providersData ? 'OK' : 'Failed'}`);

	const modelsData = loadAndValidate<ModelConfigFile>(
		path.join(sharedConfigDir, 'models.json'),
		ModelConfigFileSchema,
		errors,
		checkedFiles
	);
	console.log(`Checked models.json: ${modelsData ? 'OK' : 'Failed'}`);

	const promptsData = loadAndValidate<PromptConfigFile>(
		path.join(agentConfigDir, 'prompts.json'),
		PromptConfigFileSchema,
		errors,
		checkedFiles
	);
	console.log(`Checked prompts.json: ${promptsData ? 'OK' : 'Failed'}`);

	const tasksData = loadAndValidate<TaskConfigFile>( // Using Task for now
		path.join(agentConfigDir, 'tasks.json'),
		TaskConfigFileSchema, // Using Task for now
		errors,
		checkedFiles
	);
	console.log(`Checked tasks.json: ${tasksData ? 'OK' : 'Failed'}`);
	console.log('---');


	// --- Perform Cross-Reference Checks ---
	// Only run checks if the necessary files loaded and parsed correctly
	performCrossChecks(providersData, modelsData, promptsData, tasksData, errors, warnings);


	// --- Report Results ---
	const report: ValidationReport = {
		isValid: errors.length === 0,
		errors: errors,
		warnings: warnings,
		checkedFiles: checkedFiles,
	};

	console.log('\n--- Validation Report ---');
	if (report.isValid) {
		console.log('✅ Configuration validation successful!');
	} else {
		console.error(`❌ Configuration validation failed with ${report.errors.length} error(s):`);
		report.errors.forEach((err, index) => console.error(`  ${index + 1}. ${err}`));
	}

	if (report.warnings.length > 0) {
		console.warn(`\n⚠️ Validation generated ${report.warnings.length} warning(s):`);
		report.warnings.forEach((warn, index) => console.warn(`  ${index + 1}. ${warn}`));
	}
	console.log('--- Report End ---');

	return report;
}

// --- Example Usage (e.g., run via bun scripts/validate-configs.ts) ---
if (import.meta.main) {
	// Example paths - Adjust these to your actual project structure
	// You might get these from command line arguments (process.argv) or environment variables
	const defaultSharedPath = path.resolve(process.cwd(), 'src/agents/config'); // Example shared path
	const defaultAgentPath = path.resolve(process.cwd(), 'src/agents/profile-agent/config'); // Example agent path

	const sharedDir = process.argv[2] || defaultSharedPath;
	const agentDir = process.argv[3] || defaultAgentPath;

	if (!fs.existsSync(sharedDir)) {
		console.error(`Error: Shared config directory not found: ${sharedDir}`);
		process.exit(1);
	}
	if (!fs.existsSync(agentDir)) {
		console.error(`Error: Agent config directory not found: ${agentDir}`);
		process.exit(1);
	}

	const finalReport = validateAllConfigs(sharedDir, agentDir);

	// Exit with error code if validation failed (useful for CI/CD)
	if (!finalReport.isValid) {
		process.exit(1);
	}
}
