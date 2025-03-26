import type { PromptConfig, PromptTemplate, Prompts, SubpromptDefinition, SubpromptDefinitionSchema } from "./schemas/promptConfig.js";

// Re-export the schema types
export type { PromptConfig, PromptTemplate, Prompts, SubpromptDefinition, SubpromptDefinitionSchema };

export const templates: Record<string, PromptTemplate> = {};

/**
 * Template variables for prompt construction
 */
export interface PromptVariables {
	readonly [key: string]: unknown;
}

/**
 * Template identifier for referencing templates
 */
export interface TemplateIdentifier {
	readonly templateName: string;
}

/**
 * Prompt options for configuration
 */
export interface PromptOptions {
	readonly systemPrompt?: string;
	readonly temperature?: number;
	readonly maxTokens?: number;
}

/**
 * Configuration for the prompt service
 */
export interface PromptServiceConfig {
	readonly debug?: boolean;
	readonly configPath: string;
	readonly environment?: string;
	readonly basePath?: string;
}

/**
 * Error details for prompt-related errors
 */
export interface PromptErrorDetails {
	readonly templateName?: string;
	readonly variableName?: string;
}

/**
 * Custom error for prompt-related issues
 */
export class PromptError extends Error {
	readonly code: string = '';
	readonly templateName?: string;
	readonly variableName?: string;

	constructor(
		message: string,
		{ templateName, variableName }: PromptErrorDetails
	) {
		super(message);
		this.name = 'PromptError';
		Object.assign(this, {
			code: 'PROMPT_ERROR',
			templateName,
			variableName
		});
	}
}

/**
 * Interface for prompt service
 */
export interface IPromptService {
	/**
	 * Retrieves a prompt template by its identifier
	 */
	getTemplate(identifier: TemplateIdentifier): PromptTemplate;

	/**
	 * Generates a complete prompt by rendering the template with variables
	 */
	generatePrompt(
		identifier: TemplateIdentifier,
		variables: PromptVariables,
		options?: PromptOptions
	): Promise<string>;

	/**
	 * Gets all template identifiers
	 */
	getTemplateIds(): string[];

	/**
	 * Validates if all required variables are present
	 */
	validateVariables(
		template: PromptTemplate,
		variables: PromptVariables
	): boolean;
}
