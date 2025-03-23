/**
 * Configuration types for prompt templates
 */
import type { BaseConfig } from './baseConfig.js';

/**
 * System prompt definition
 */
export interface SystemPromptDefinition {
  /** Name of the prompt template file */
  readonly promptFileName: string;
  /** Template for the prompt to use for this task */
  readonly promptTemplate?: string;
}

/**
 * Subprompt definition with ordering
 */
export interface SubpromptDefinition extends SystemPromptDefinition {
  /** Whether the subprompt is required */
  readonly required?: boolean;
  /** Order of the subprompt (lower values come first) */
  readonly order?: number;
}

/**
 * Prompt template configuration
 */
export interface PromptConfig extends BaseConfig {
  /** System prompt configuration */
  readonly systemPrompt: SystemPromptDefinition;
  /** Optional subprompts to include */
  readonly subprompts?: ReadonlyArray<SubpromptDefinition>;
}

/**
 * Complete prompts configuration mapping prompt names to definitions
 */
export interface PromptsConfig {
  /** Prompt templates indexed by name */
  readonly [promptName: string]: PromptConfig;
}
