import type { AgentState } from '../agent-service/types.js'
import type { NormalizedProfile } from '../types.js'

/**
 * Input for the persona image agent
 */
export interface ImageInput {
    readonly inputDir: string
    readonly outputDir: string
}

/**
 * Output from the persona image agent
 */
export interface ImageOutput {
    readonly images: readonly Image[]
    readonly imageResults: readonly ImageResult[]
    readonly summary: ImageSummary
}

/**
 * Domain state for the persona image agent
 */
export interface ImageDomainState {
    readonly profiles: readonly NormalizedProfile[]
    readonly images: readonly Image[]
    readonly imageResults: readonly ImageResult[]
}

/**
 * Image data structure
 */
export interface Image {
    readonly id: string
    readonly content: string
    readonly profileId: string
    readonly url: string
}

/**
 * Result of generating an image
 */
export interface ImageResult {
    readonly profileId: string
    readonly success: boolean
    readonly error?: string
    readonly duration: number
    readonly modelUsed: string
    readonly tokensUsed?: number
    readonly imageUrl?: string
}

/**
 * Summary of image generation process
 */
export interface ImageSummary {
    readonly totalProfiles: number
    readonly successfulGenerations: number
    readonly failedGenerations: number
    readonly totalDuration: number
    readonly totalTokensUsed: number
    readonly completedAt?: string
}

/**
 * Combined agent state type
 */
export type ImageAgentState = AgentState<ImageInput, ImageOutput, ImageDomainState> & ImageDomainState 