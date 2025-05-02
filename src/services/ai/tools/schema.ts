/**
 * @file Defines Effect Schemas for Tool Definition Metadata.
 * @module services/tools/schema
 */

import { Schema } from "effect";

// Define SimpleToolName as a branded string or just use string
// Using string for simplicity now. Can add branding if needed.
export type SimpleToolName = string;

/**
 * Schema for the metadata definition of a Tool.
 * Focuses on information needed for discovery and LLM selection.
 * The detailed input/output schemas for validation are associated
 * with the tool's implementation during registration.
 */
export const ToolDefinitionSchema = Schema.Struct({
    /**
     * Unique identifier for the tool within its namespace (e.g., "calculator", "getContent").
     * This is the 'simple' name. The full name will include namespace prefixes.
     */
    name: Schema.String.pipe(
        Schema.minLength(1),
        // Optional: Add regex pattern if needed, e.g., Schema.pattern(/^[a-zA-Z0-9_]+$/)
    ), // Type is SimpleToolName implicitly

    /**
     * Clear description of what the tool does, critical for LLM selection.
     * Should detail expected input parameters (names, types, purpose) and
     * the structure/meaning of the output.
     * Example: "Calculates the result of a simple arithmetic expression. Input: { expression: string }. Output: { result: number }."
     */
    description: Schema.String.pipe(Schema.minLength(1)),
});

/**
 * Type inferred from {@link ToolDefinitionSchema}.
 * Represents the validated metadata for a tool definition.
 */
export type ToolDefinition = Schema.Schema.Type<typeof ToolDefinitionSchema>;

// --- Optional: Schema for loading static metadata ---
// Even if registration is primarily programmatic, having a schema for
// potentially loading metadata from a file can be useful.

/**
 * Schema for a static configuration file listing tool metadata.
 * Contains an array of tool definitions (metadata only).
 */
export const ToolsConfigFileSchema = Schema.Struct({
    tools: Schema.Array(ToolDefinitionSchema).pipe(Schema.minItems(0)), // Allow empty tools file
});

/**
 * Type inferred from {@link ToolsConfigFileSchema}.
 * Represents the structure of a tools metadata configuration file after validation.
 */
export type ToolsConfigFile = Schema.Schema.Type<typeof ToolsConfigFileSchema>;
