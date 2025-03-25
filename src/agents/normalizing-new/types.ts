import { z } from 'zod'
import type { AgentState } from '../agent-service/types.js'
import type { BaseProfile, NormalizedProfile } from '../types.js'

// Re-export NormalizedProfile
export type { NormalizedProfile }

/**
 * Input for the normalizing agent
 */
export interface NormalizingInput {
    readonly inputDir: string
    readonly outputDir: string
}

/**
 * Output from the normalizing agent
 */
export interface NormalizingOutput {
    readonly normalizedProfiles: readonly NormalizedProfile[]
    readonly summary: NormalizationSummary
}

/**
 * Domain-specific state for the normalizing agent
 */
export interface NormalizingDomainState {
    readonly profiles: readonly BaseProfile[]
    readonly normalizedProfiles: readonly NormalizedProfile[]
    readonly normalizationResults: readonly NormalizationResult[]
}

/**
 * Status states for normalization
 */
export const NormalizationStatusSchema = z.enum([
    'initializing',
    'loading',
    'normalizing',
    'saving',
    'completed',
    'error'
])

export type NormalizationStatus = z.infer<typeof NormalizationStatusSchema>

/**
 * Result of normalizing a single profile
 */
export interface NormalizationResult {
    readonly profileId: string
    readonly success: boolean
    readonly error?: string
    readonly duration: number
    readonly modelUsed: string
    readonly tokensUsed?: number
}

/**
 * Summary of normalization run
 */
export interface NormalizationSummary {
    readonly totalProfiles: number
    readonly successfulNormalizations: number
    readonly failedNormalizations: number
    readonly totalDuration: number
    readonly totalTokensUsed: number
}

/**
 * Complete agent state type
 */
export type NormalizingAgentState = AgentState<NormalizingInput, NormalizingOutput, NormalizingDomainState> 