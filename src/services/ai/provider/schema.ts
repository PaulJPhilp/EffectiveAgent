/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */

import { Description, Name, RateLimit, Url } from "@/schema.js"; // Correct: Adjust path as necessary
import * as S from "effect/Schema";
import { PROVIDER_NAMES } from "./provider-universe.js";

/**
 * Providers schema and type derived from the canonical provider universe.
 * 
 * The PROVIDER_NAMES tuple is inferred from the PROVIDER_UNIVERSE in provider-universe.ts.
 * This approach allows for a single source of truth for provider names.
 */
export const Providers = S.Literal(...PROVIDER_NAMES);
export type ProvidersType = typeof Providers.Type;

/**
 * Schema for a single AI Provider configuration entry.
 */
export class ProviderConfigSchema extends S.Class<ProviderConfigSchema>("ProviderConfigSchema")({
    name: Providers,
    displayName: Name,
    type: S.String.pipe(S.minLength(1)),
    apiKeyEnvVar: S.optional(S.String.pipe(S.minLength(1))),
    baseUrl: S.optional(Url),
    rateLimit: S.optional(RateLimit),
}) { }

export class ProviderFile extends S.Class<ProviderFile>("ProviderFile")({
    version: S.String, // Added version field
    description: Description,
    name: Name,
    providers: S.Array(ProviderConfigSchema)
}) { }