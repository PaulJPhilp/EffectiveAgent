/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */

import { Description, Name, RateLimit, Url } from "@/schema.js"; // Correct: Adjust path as necessary
import * as S from "effect/Schema";



export const Providers = S.Literal("openai", "anthropic", "google", "xai", "perplexity", "groq", "deepseek", "openrouter");
export type ProvidersType = typeof Providers.Type;

/**
 * Schema for a single AI Provider configuration entry.
 */
export class Provider extends S.Class<Provider>("Provider")({
    name: Providers,
    displayName: Name,
    type: S.String.pipe(S.minLength(1)),
    apiKeyEnvVar: S.optional(S.String.pipe(S.minLength(1))),
    baseUrl: S.optional(Url),
    rateLimit: S.optional(RateLimit),
}) { }

export class ProviderFile extends S.Class<ProviderFile>("ProviderFile")({
    description: Description,
    name: Name,
    providers: S.Array(Provider)
}) { }