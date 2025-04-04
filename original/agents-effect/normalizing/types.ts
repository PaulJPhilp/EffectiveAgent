import { Effect } from "effect"
import { z } from "zod"
import type { BaseProfile, NormalizedProfile } from "../../agents/types.js"
import type { JSONArray, JSONObject, JSONValue } from "../../types.js"

// --- Input/Output Types ---

/**
 * Input schema for the normalizing agent
 */
export const NormalizingInputSchema = z.object({
    inputDir: z.string().describe("Directory containing PDF files to normalize"),
    outputDir: z.string().describe("Directory to save normalized profiles"),
    modelId: z.string().optional().describe("Optional model ID to use for normalization")
}).strict()

export type NormalizingInput = z.infer<typeof NormalizingInputSchema> & JSONObject

/**
 * Output schema for the normalizing agent
 */
export const NormalizingOutputSchema = z.object({
    normalizedProfiles: z.array(z.custom<NormalizedProfile>()),
    summary: z.object({
        totalProfiles: z.number(),
        successfulNormalizations: z.number(),
        failedNormalizations: z.number(),
        totalDuration: z.number(),
        totalTokensUsed: z.number()
    })
}).strict()

export type NormalizingOutput = z.infer<typeof NormalizingOutputSchema> & JSONObject

// --- Domain State Types ---

/**
 * Domain-specific state for the normalizing agent
 */
export interface NormalizingDomainState extends JSONObject {
    readonly profiles: JSONArray
    readonly normalizedProfiles: JSONArray
    readonly normalizationResults: JSONArray
    [key: string]: JSONValue
}

/**
 * Result of normalizing a single profile
 */
export interface NormalizationResult extends JSONObject {
    readonly profileId: string
    readonly success: boolean
    readonly error?: string
    readonly duration: number
    readonly modelUsed: string
    readonly tokensUsed?: number
    [key: string]: JSONValue
}

// --- Error Types ---

/**
 * Base error class for normalization errors
 */
export class NormalizationError extends Error {
    readonly _tag: "NormalizationError" | "ProfileLoadError" | "ProfileNormalizationError" = "NormalizationError"

    constructor(message: string, readonly cause?: unknown) {
        super(message)
        this.name = "NormalizationError"
    }
}

/**
 * Error thrown when profile loading fails
 */
export class ProfileLoadError extends NormalizationError {
    readonly _tag = "ProfileLoadError"

    constructor(message: string, readonly filePath: string, cause?: unknown) {
        super(`Failed to load profile at ${filePath}: ${message}`, cause)
        this.name = "ProfileLoadError"
    }
}

/**
 * Error thrown when profile normalization fails
 */
export class ProfileNormalizationError extends NormalizationError {
    readonly _tag = "ProfileNormalizationError"

    constructor(message: string, readonly profileId: string, cause?: unknown) {
        super(`Failed to normalize profile ${profileId}: ${message}`, cause)
        this.name = "ProfileNormalizationError"
    }
}

// --- Effect Types ---

/**
 * Effect type for loading profiles
 */
export type LoadProfilesEffect = Effect.Effect<
    readonly BaseProfile[],
    ProfileLoadError,
    never
>

/**
 * Effect type for normalizing profiles
 */
export type NormalizeProfilesEffect = Effect.Effect<
    readonly NormalizedProfile[],
    ProfileNormalizationError,
    never
>

/**
 * Effect type for saving results
 */
export type SaveResultsEffect = Effect.Effect<
    void,
    NormalizationError,
    never
> 