/**
 * @file Defines Zod schemas for AI Provider configuration,
 * typically loaded from a file like 'provider.json'.
 */

import { z } from "zod";
// Import the global ProviderNameSchema
import { ProviderNameSchema } from "../../schema.js"; // Assuming global schema has the enum

// Schema for rate limit information (optional fields)
const RateLimitSchema = z.object({
    requestsPerMinute: z.number().int().positive().optional(),
    tokensPerMinute: z.number().int().positive().optional(),
    // Add other potential rate limit fields if needed
}).nullable().optional(); // Allow null or undefined for the whole object

// Schema for a single provider configuration entry
export const ProviderConfigSchema = z.object({
    /** Unique internal name for the provider (matches ProviderName enum). */
    name: ProviderNameSchema,
    /** User-friendly display name. */
    displayName: z.string().min(1),
    /**
     * Type identifier, often matches 'name' but allows for variations
     * (e.g., multiple providers might use an 'openai' compatible API type).
     * This might be used by the Vercel AI SDK or internal adapters.
     */
    type: z.string().min(1), // Could potentially be an enum too if types are restricted
    /** Environment variable name holding the API key. Optional for providers like 'local'. */
    apiKeyEnvVar: z.string().min(1).optional(),
    /** Base URL for the provider's API. Can be null or optional for some providers. */
    baseUrl: z.string().url().nullable().optional(),
    /** Rate limit information (optional). */
    rateLimit: RateLimitSchema, // Already optional from definition above
});
// Ensure type is exported
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Schema for the root configuration object (e.g., provider.json)
export const ProvidersConfigSchema = z.object({
    /** Array of provider configurations. Must contain at least one. */
    providers: z.array(ProviderConfigSchema).min(1, { message: "At least one provider must be configured." }),
    /** The 'name' of the default provider to use if none is specified. Must match one of the providers in the array. */
    defaultProviderName: ProviderNameSchema,
}).refine(
    (data) => data.providers.some((p) => p.name === data.defaultProviderName),
    {
        message: "defaultProviderName must match the name of one provider in the providers array",
        path: ["defaultProviderName"], // Path to the failing field
    }
);
// Ensure type is exported
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
