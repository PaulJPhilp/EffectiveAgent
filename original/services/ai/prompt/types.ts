// File: src/shared/services-effect/prompt/types.ts

import { Effect, Context } from "effect";
import type { PromptTemplate, PromptConfigFile } from './schema.js';
import type { PromptNotFoundError, PromptRenderingError, PromptVariableMissingError } from './errors.js';

// --- Type Definitions ---
export type PromptVariables = Record<string, unknown>;

export interface PromptRenderOptions {
  readonly variables: PromptVariables;
  readonly validateVariables?: boolean;
}

// --- Declare Brand Symbols ---
declare const PromptConfigurationServiceBrand: unique symbol;
declare const PromptServiceBrand: unique symbol;

// --- Service Interfaces using Branded Types ---
export interface PromptConfigurationService {
  readonly [PromptConfigurationServiceBrand]?: never;

  /** Get prompt template by its unique ID */
  readonly getPromptTemplate: (promptId: string) => Effect.Effect<PromptTemplate, PromptNotFoundError>;

  /** List all available prompts */
  readonly listPrompts: () => Effect.Effect<ReadonlyArray<PromptTemplate>>;

  /** Find prompts by category */
  readonly findPromptsByCategory: (category: string) => Effect.Effect<ReadonlyArray<PromptTemplate>>;
}

export interface PromptService {
  readonly [PromptServiceBrand]?: never;

  /** Render a prompt template with variables */
  readonly renderPrompt: (
    promptId: string,
    options: PromptRenderOptions
  ) => Effect.Effect<string, PromptNotFoundError | PromptRenderingError | PromptVariableMissingError>;

  /** Render a raw template string with variables */
  readonly renderTemplate: (
    template: string,
    options: PromptRenderOptions
  ) => Effect.Effect<string, PromptRenderingError | PromptVariableMissingError>;
}

// --- Service Tags ---
export const PromptConfigurationService = Context.GenericTag<PromptConfigurationService>("PromptConfigurationService");
export const PromptService = Context.GenericTag<PromptService>("PromptService");

// --- Configuration Data Tag ---
export interface PromptConfigFileTag extends PromptConfigFile { }
export const PromptConfigFileTag = Context.GenericTag<PromptConfigFileTag>("PromptConfigFileTag");
