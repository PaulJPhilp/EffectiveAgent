/**
 * @file Defines Tags and supporting types for the Prompt service.
 * Service implementation types are inferred from 'make' objects.
 */

import { Context, Effect } from "effect";
import type { JsonObject } from "../../types.js";
import type { PromptError, TemplateNotFoundError, PromptConfigurationError } from "./errors.js";
import type { PromptDefinition } from "./schema.js";
// Import types needed for R signatures if they appear in the final inferred type
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/types.js";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";

// --- Service Tags (Defined with standard Tag<Identifier>) ---

/**
 * Tag for the PromptConfiguration service.
 * The actual service type provided by its layer is inferred from the 'make' object in configuration.ts.
 */
// Use Context.Tag directly with the service interface type alias defined below
export const PromptConfiguration = Context.GenericTag<PromptConfiguration>("PromptConfiguration");

/**
 * Tag for the PromptApi service.
 * The actual service type provided by its layer is inferred from the 'make' object in main.ts.
 */
// Use Context.Tag directly with the service interface type alias defined below
export const PromptApi = Context.GenericTag<PromptApi>("PromptApi");


// --- Service Interface Types (Inferred from Implementation - Placeholders) ---
// These types are derived from the 'make' objects in main.ts/configuration.ts
// Consumers typically import the Tag directly. Exporting the type alias is optional.

// Placeholder structure - the real type is inferred in configuration.ts
export type PromptConfiguration = {
    readonly getPromptDefinitionByName: (name: string) => Effect.Effect<PromptDefinition, TemplateNotFoundError | PromptConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>;
    readonly listPromptDefinitions: () => Effect.Effect<ReadonlyArray<PromptDefinition>, PromptConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>;
};

// Placeholder structure - the real type is inferred in main.ts
export type PromptApi = {
    readonly renderTemplate: (params: { templateName: string; context: JsonObject; }) => Effect.Effect<string, PromptError | TemplateNotFoundError | PromptConfigurationError, PromptConfiguration | ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>;
    readonly renderString: (params: { templateString: string; context: JsonObject; }) => Effect.Effect<string, PromptError>;
};


// --- Supporting Types ---
// (Define any supporting types needed by consumers here)
