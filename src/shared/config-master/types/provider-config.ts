import { z } from "zod";

/**
 * Provider types supported by the system
 */
export const ProviderType = {
    OPENAI: "openai",
    ANTHROPIC: "anthropic",
    GOOGLE: "google",
    GROQ: "groq",
    LOCAL: "local"
} as const;

export type ProviderType = typeof ProviderType[keyof typeof ProviderType];

/**
 * Rate limit configuration for a provider
 */
export interface ProviderRateLimit {
    readonly requestsPerMinute: number;
    readonly tokensPerMinute?: number;
}

/**
 * Configuration for a single provider
 */
export interface ProviderConfig {
    readonly name: string;
    readonly displayName: string;
    readonly type: ProviderType;
    readonly apiKeyEnvVar?: string;
    readonly baseUrl: string;
    readonly rateLimit: ProviderRateLimit;
}

/**
 * Root configuration containing all providers
 */
export interface ProviderConfigFile {
    readonly providers: ProviderConfig[];
    readonly defaultProviderName: string;
}

// Zod Schemas

export const ProviderRateLimitSchema = z.object({
    requestsPerMinute: z.number().positive(),
    tokensPerMinute: z.number().positive().optional()
});

export const ProviderTypeSchema = z.enum([
    ProviderType.OPENAI,
    ProviderType.ANTHROPIC,
    ProviderType.GOOGLE,
    ProviderType.GROQ,
    ProviderType.LOCAL
]);

export const ProviderConfigSchema = z.object({
    name: z.string(),
    displayName: z.string(),
    type: ProviderTypeSchema,
    apiKeyEnvVar: z.string().optional(),
    baseUrl: z.string().url(),
    rateLimit: ProviderRateLimitSchema
});

export const ProviderConfigFileSchema = z.object({
    providers: z.array(ProviderConfigSchema),
    defaultProviderName: z.string()
}); 