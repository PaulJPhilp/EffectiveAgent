import { z } from "zod"
import type { BaseConfig } from "../../configuration/types/configTypes.js";

export const ProviderConfigSchema = z.object({
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

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const ProvidersConfigSchema = z.object({
    name: z.string().describe("Configuration name"),
    version: z.string().describe("Configuration version"),
    providers: z.array(ProviderConfigSchema).describe("List of provider configurations"),
    defaultProviderId: z.string().describe("Default provider ID")
});

export interface ProvidersConfig extends BaseConfig {
    readonly providers: ProviderConfig[];
    readonly defaultProviderId: string;
} 