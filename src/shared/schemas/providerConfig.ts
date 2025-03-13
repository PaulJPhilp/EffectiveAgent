import { z } from "zod"

export const ProviderConfigSchema = z.object({
    id: z.string().describe("Unique identifier for the provider"),
    name: z.string().describe("Display name of the provider"),
    type: z.enum(["openai", "anthropic", "google", "local"]).describe("Type of provider"),
    apiVersion: z.string().optional().describe("API version to use"),
    baseUrl: z.string().optional().describe("Base URL for API requests"),
    defaultHeaders: z.record(z.string()).optional().describe("Default headers to include in requests"),
    rateLimit: z.object({
        requestsPerMinute: z.number(),
        tokensPerMinute: z.number().optional()
    }).optional().describe("Rate limiting configuration")
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

export const ProvidersConfigSchema = z.object({
    providers: z.array(ProviderConfigSchema),
    defaultProviderId: z.string()
})

export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema> 