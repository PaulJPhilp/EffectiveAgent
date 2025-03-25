import { z } from "zod"

export const ProviderSchema = z.object({
    id: z.string().describe("Unique identifier for the provider"),
    name: z.string().describe("Display name of the provider"),
    type: z.enum(["openai", "anthropic", "google", "local", "grok", "deepseek"]).describe("Type of provider"),
    apiVersion: z.string().optional().describe("API version to use"),
    baseUrl: z.string().optional().describe("Base URL for API requests"),
    defaultHeaders: z.record(z.string()).optional().describe("Default headers to include in requests"),
    rateLimit: z.object({
        requestsPerMinute: z.number(),
        tokensPerMinute: z.number().optional()
    }).optional().describe("Rate limiting configuration")
});

export type Provider = z.infer<typeof ProviderSchema>;

export const ProvidersFileSchema = z.object({
    name: z.string().describe("Configuration name"),
    version: z.string().describe("Configuration version"),
    providers: z.array(ProviderSchema).describe("List of provider configurations"),
    defaultProviderId: z.string().describe("Default provider ID")
});

export type Providers = z.infer<typeof ProvidersFileSchema>;