import { z } from 'zod';
import { ModelProviderSchema } from '../../../types.js';
import { BaseConfigSchema } from '../configuration/schema.js'; // Base schema
import { ModelCapability } from "./types.ts"; // Import ModelCapability
/**
 * Base schema for a single provider configuration.
 */
export const ProviderConfigSchema = BaseConfigSchema.extend({
  name: ModelProviderSchema
    .describe("The name of the provider implementation"),
  displayName: z.string()
    .describe("Human-readable display name"),
  type: ModelProviderSchema
    .describe("The type of provider implementation"),
  apiKeyEnvVar: z.string().optional()
    .describe("Environment variable containing the API key"),
  baseUrl: z.string().url()
    .describe("Base URL for the provider API"),
  rateLimit: z.object({
    requestsPerMinute: z.number().positive(),
    tokensPerMinute: z.number().positive().optional()
  }).describe("Rate limiting configuration"),
  // Add optional fields expected by BaseModelProvider implementation
  models: z.array(z.string()).optional().describe("Supported models"),
  capabilities: z.array(z.nativeEnum(ModelCapability)).optional().describe("Supported capabilities")
}).strict();

/**
 * Specific configuration schema for OpenAI providers.
 * Extends the base ProviderConfigSchema.
 */
export const OpenAIProviderConfigSchema = ProviderConfigSchema.extend({
  name: z.literal("openai"), // Override name to be specific
  models: z.array(z.string()).describe("Supported models"),
  capabilities: z.array(z.nativeEnum(ModelCapability)).describe("Supported capabilities"),
}).strict();

/**
 * Specific configuration schema for Anthropic providers.
 * Extends the base ProviderConfigSchema.
 */
export const AnthropicProviderConfigSchema = ProviderConfigSchema.extend({
  name: z.literal("anthropic"), // Override name to be specific
  apiVersion: z.string().default('2023-06-01')
    .describe("Anthropic API version"),
  // Add other Anthropic-specific fields if needed
}).strict();

/**
 * A discriminated union of all specific provider configuration schemas.
 * This allows parsing into the correct specific provider config type.
 */
export const AnyProviderConfigSchema = z.discriminatedUnion("name", [
  OpenAIProviderConfigSchema,
  AnthropicProviderConfigSchema,
  // Add other provider schemas here (e.g., GoogleProviderConfigSchema)
]);

/**
 * Schema for the array containing multiple provider configurations.
 */
export const ProvidersSchema = z.array(AnyProviderConfigSchema)
  .min(1, { message: "At least one provider must be defined" });

/**
 * Schema for the root providers configuration file
 */
export const ProviderConfigFileSchema = z.object({
  providers: z.array(ProviderConfigSchema)
    .min(1, { message: "At least one provider must be defined" }),
  defaultProviderName: z.string()
    .describe("Default provider to use when none specified")
}).strict();

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type OpenAIProviderConfig = z.infer<typeof OpenAIProviderConfigSchema>;
export type AnthropicProviderConfig = z.infer<typeof AnthropicProviderConfigSchema>;
export type AnyProviderConfig = z.infer<typeof AnyProviderConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersSchema>; // Array type
export type ProviderConfigFile = z.infer<typeof ProviderConfigFileSchema>;