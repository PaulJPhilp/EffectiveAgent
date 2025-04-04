/**
 * @file Defines Zod schemas for AI Provider configuration,
 * typically loaded from a file like 'provider.json'.
 */

import { z } from "zod";
// Import the global ProviderNameSchema if it exists and is suitable,
// otherwise define provider names/types locally if needed.
import { ProviderNameSchema } from "../../schema.js"; // Assuming global schema has the enum

// Schema for rate limit information (optional fields)
const RateLimitSchema = z.object({
    requestsPerMinute: z.number().int().positive().optional(),
    tokensPerMinute: z.number().int().positive().optional(),
    // Add other potential rate limit fields if needed
}).nullable(); // Allow the whole rateLimit object to be null

// Schema for a single provider configuration entry
export const ProviderConfigSchema = z.object({
    /** Unique internal name for the provider (matches ProviderName enum). */
    name: ProviderNameSchema, // Use the shared enum schema
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
    rateLimit: RateLimitSchema.optional(),
    /** Optional: List of specific models known to be offered by this provider. */
    // models: z.array(z.string()).optional(), // Consider adding if needed for validation/mapping
    /** Optional: Any other provider-specific metadata. */
    // metadata: z.record(z.unknown()).optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Schema for the root configuration object (e.g., provider.json)
export const ProvidersConfigSchema = z.object({
    /** Array of provider configurations. Must contain at least one. */
    providers: z.array(ProviderConfigSchema).min(1),
    /** The 'name' of the default provider to use if none is specified. Must match one of the providers in the array. */
    defaultProviderName: ProviderNameSchema, // Ensure default is a valid provider name
}).refine(
    (data) => data.providers.some((p) => p.name === data.defaultProviderName),
    {
        message: "defaultProviderName must match the name of one provider in the providers array",
        path: ["defaultProviderName"], // Path to the failing field
    }
);
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;