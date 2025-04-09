/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */

import { Schema } from "effect"; // Correct: Import from 'effect'

/**
 * Schema for the unique name/identifier of an AI provider.
 * Must be at least 3 characters long.
 */
export const ProviderNameSchema = Schema.String.pipe(Schema.minLength(3));
export type ProviderName = Schema.Schema.Type<typeof ProviderNameSchema>;

/**
 * Schema representing a positive integer.
 */
const PositiveIntSchema = Schema.Number.pipe(
    Schema.int(), // Correct: Schema.int() exists
    Schema.greaterThan(0), // Correct: Use greaterThan(0)
);

/**
 * Schema for the core structure of rate limit information.
 */
const RateLimitStructSchema = Schema.Struct({
    // Correct: Pass Schema.optional reference when no options
    requestsPerMinute: PositiveIntSchema.pipe(Schema.optional),
    // Correct: Pass Schema.optional reference when no options
    tokensPerMinute: PositiveIntSchema.pipe(Schema.optional),
});

/**
 * Schema for a single AI Provider configuration entry.
 */
export const ProviderDefinitionSchema = Schema.Struct({
    name: ProviderNameSchema,
    displayName: Schema.String.pipe(Schema.minLength(1)),
    type: Schema.String.pipe(Schema.minLength(1)),
    // Correct: Pass Schema.optional reference when no options
    apiKeyEnvVar: Schema.String.pipe(Schema.minLength(1), Schema.optional),
    // Correct: Call Schema.optional() *only* when passing options
    baseUrl: Schema.String.pipe(Schema.optional),
    // Correct: Call Schema.optional() *only* when passing options
    rateLimit: RateLimitStructSchema.pipe(Schema.optional),
});
export type ProviderDefinition = Schema.Schema.Type<
    typeof ProviderDefinitionSchema
>;

// Define the input type before the filter
const ProvidersConfigFileInputSchema = Schema.Struct({
    providers: Schema.Array(ProviderDefinitionSchema).pipe(Schema.minItems(1)),
    defaultProviderName: ProviderNameSchema,
});

/**
 * Schema for the root configuration file (e.g., providers.json).
 * Contains an array of provider definitions and the default provider name.
 */
export const ProvidersConfigFileSchema = ProvidersConfigFileInputSchema.pipe(
    Schema.filter(
        // Filter function without type predicate
        (data) => data.providers.some((p) => p.name === data.defaultProviderName),
        {
            // Static message function to avoid type inference issues
            message: () =>
                "defaultProviderName must match the name of one provider in the providers array",
            identifier: "DefaultProviderExists",
        },
    ),
);

/**
 * Type inferred from {@link ProvidersConfigFileSchema}.
 * Represents the structure of the providers configuration file after validation.
 */
export type ProvidersConfigFile = Schema.Schema.Type<
    typeof ProvidersConfigFileSchema
>;
