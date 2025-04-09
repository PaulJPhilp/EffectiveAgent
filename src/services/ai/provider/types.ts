/**
 * @file Defines types and the Context Tag for the AI Provider configuration data.
 * @module services/ai/provider/types
 */

// Import Schema, Context, Data, HashMap from 'effect'
import { Context, Data, HashMap, Schema } from "effect";
// Import types derived from schemas using 'import type'
import type {
    ProviderDefinitionSchema,
    ProviderNameSchema,
    ProvidersConfigFileSchema,
} from "./schema.js";

// --- Inferred Types from Schema ---

/**
 * Type inferred from {@link ProviderNameSchema}.
 * Represents the unique name of an AI provider.
 */
export type ProviderName = Schema.Schema.Type<typeof ProviderNameSchema>;

/**
 * Type inferred from {@link ProviderDefinitionSchema}.
 * Represents a single configured AI provider definition as loaded from the file.
 */
export type ProviderDefinition = Schema.Schema.Type<
    typeof ProviderDefinitionSchema
>;

/**
 * Type inferred from {@link ProvidersConfigFileSchema}.
 * Represents the raw structure of the providers configuration file after validation.
 */
export type ProvidersConfigFile = Schema.Schema.Type<
    typeof ProvidersConfigFileSchema
>;

// --- Derived Data Structures ---

/**
 * Represents the loaded and processed provider configuration data,
 * structured as a HashMap for efficient lookup by provider name, using Data.TaggedClass.
 * Also includes the name of the default provider.
 * This is the structure that will be available in the Effect Context.
 */
export class ProviderConfigData extends Data.TaggedClass("ProviderConfigData")<{
    readonly providers: HashMap.HashMap<ProviderName, ProviderDefinition>;
    readonly defaultProviderName: ProviderName;
}> { }

// --- Context Tag ---

/**
 * Effect Context Tag for accessing the loaded and processed AI Provider
 * configuration data (`ProviderConfigData`).
 * Services that need provider information will depend on this Tag.
 */
export const ProviderConfigDataTag = Context.GenericTag<ProviderConfigData>(
    "@services/ai/provider/ProviderConfigData",
);
