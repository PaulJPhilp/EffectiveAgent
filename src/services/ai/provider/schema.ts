/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */

import { Description, Name, RateLimit } from "@/schema.js"; // Correct: Adjust path as necessary
import * as S from "effect/Schema";


/**`
 * Schema for a single AI Provider configuration entry.
 */
export class Provider extends S.Class<Provider>("Provider")({
    name: Name,
    displayName: Name,
    type: S.String.pipe(S.minLength(1)),
    apiKeyEnvVar: S.String.pipe(S.minLength(1), S.optional),
    baseUrl: S.String.pipe(S.optional),
    rateLimit: RateLimit.pipe(S.optional),
}) { }

export class ProviderFile extends S.Class<ProviderFile>("ProviderFile")({
    description: Description,
    name: Name,
    providers: S.Array(Provider)
}) { }