/**
 * @file Defines Effect Schemas for AI Provider definitions and configurations,
 * typically loaded from a file like 'providers.json'.
 * @module services/ai/provider/schema
 */

import { Schema as S } from "effect"; // Correct: Import from 'effect'
import {  Name, RateLimit } from "@/schema.js"; // Correct: Adjust path as necessary


/**
 * Schema for a single AI Provider configuration entry.
 */
export class Provider extends S.Class<Provider>("Provider")({
    name: Name,
    displayName: Name,
    type: S.String.pipe(S.minLength(1)),
    apiKeyEnvVar: S.String.pipe(S.minLength(1), S.optional),
    baseUrl: S.String.pipe(S.optional),
    rateLimit: RateLimit.pipe(S.optional),
}) {}

// Define the input type before the filter
export class ProviderFile extends S.Class<ProviderFile>("ProviderFile")({
    providers: S.Array(Provider).pipe(S.minItems(1)),
    defaultProviderName: Name.pipe(S.optional),
    defaultModelName: Name.pipe(S.optional),
}) {}