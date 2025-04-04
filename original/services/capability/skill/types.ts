// File: src/shared/services-effect/skill/types.ts

import { Context, Effect } from "effect";
import type { JSONObject } from "../../../types.js";
import type {
  SkillExecutionError,
  SkillModelError,
  SkillNotFoundError,
  SkillPromptError
} from './errors.js';
import type { SkillConfig, SkillConfigFile } from './schema.js';

// --- Type Definitions ---
export interface SkillExecutionOptions<T extends JSONObject = JSONObject> {
  readonly skillId: string;
  readonly variables?: Record<string, unknown>;
  readonly validateVariables?: boolean;
  readonly modelOptions?: {
    readonly temperature?: number;
    readonly maxTokens?: number;
  };
  readonly expectedSchema?: T;
}

export interface TextOutput extends JSONObject {
  readonly text: string;
}

export interface SkillExecutionResult<T extends JSONObject = JSONObject> {
  readonly skillId: string;
  readonly output: T;
  readonly rawOutput: string;
  readonly duration: number;
  readonly modelTokens?: {
    readonly input: number;
    readonly output: number;
    readonly total: number;
  };
}

// --- Declare Brand Symbols ---
declare const SkillConfigurationServiceBrand: unique symbol;
declare const SkillServiceBrand: unique symbol;

// --- Service Interfaces using Branded Types ---
export interface SkillConfigurationService {
  readonly [SkillConfigurationServiceBrand]?: never;

  /** Get skill configuration by its unique ID */
  readonly getSkillConfig: (skillId: string) => Effect.Effect<SkillConfig, SkillNotFoundError>;

  /** List all available skills */
  readonly listSkills: () => Effect.Effect<ReadonlyArray<SkillConfig>>;

  /** Find skills by category */
  readonly findSkillsByCategory: (category: string) => Effect.Effect<ReadonlyArray<SkillConfig>>;
}

export interface SkillService {
  readonly [SkillServiceBrand]?: never;

  /** Execute a skill with the given options */
  readonly executeSkill: <T extends JSONObject = JSONObject>(
    options: SkillExecutionOptions<T>
  ) => Effect.Effect<
    SkillExecutionResult<T>,
    SkillNotFoundError | SkillExecutionError | SkillModelError | SkillPromptError
  >;
}

// --- Service Tags ---
export const SkillConfigurationService = Context.GenericTag<SkillConfigurationService>("SkillConfigurationService");
export const SkillService = Context.GenericTag<SkillService>("SkillService");

// --- Configuration Data Tag ---
export interface SkillConfigFileTag extends SkillConfigFile { }
export const SkillConfigFileTag = Context.GenericTag<SkillConfigFileTag>("SkillConfigFileTag");
