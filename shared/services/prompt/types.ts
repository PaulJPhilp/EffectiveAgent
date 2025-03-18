
import type { PromptDefinition, PromptDefinitionSchema, SubpromptDefinition, SubpromptDefinitionSchema } from "./schemas/promptConfig.js";

export interface PromptTemplate {
	name: string
	content: string
	variables: string[]
	subprompts: SubpromptDefinition[]
}

export const templates: Record<string, PromptTemplate> = {} 
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
 * Interface for prompt template service
 */
export interface IPromptTemplateService {
	getTemplate(identifier: TemplateIdentifier): PromptDefinition;
	buildPrompt(
		identifier: TemplateIdentifier,
		variables: PromptVariables
	): string;
	registerTemplate(template: PromptDefinition): void;
}

export type { PromptDefinition, PromptDefinitionSchema, SubpromptDefinition, SubpromptDefinitionSchema };
