/**
 * @file Defines Effect schemas for Prompt definitions and configurations.
 */

import { Schema } from "effect";

// Define the schema for the metadata record using the correct pattern
const MetadataRecordSchema = Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
});

// Schema for a single named Prompt Definition structure
// Export this directly if needed elsewhere
export const PromptDefinitionSchema = Schema.Struct({
    name: Schema.String.pipe(Schema.minLength(1)),
    description: Schema.optional(Schema.String),
    template: Schema.String.pipe(Schema.minLength(1)),
    metadata: Schema.optional(MetadataRecordSchema)
});

// Inferred type for a single prompt definition
export type PromptDefinition = Schema.Schema.Type<typeof PromptDefinitionSchema>;

// Schema for the root configuration file structure
// Export this directly - this is what PromptConfigLiveLayer will validate against
export const PromptsConfigFileSchema = Schema.Struct({
    prompts: Schema.Array(PromptDefinitionSchema).pipe(Schema.minItems(1))
});

// Inferred type for the structure of the configuration file
export type PromptsConfigFile = Schema.Schema.Type<typeof PromptsConfigFileSchema>;
