import { z } from 'zod'

/**
 * Channel reducer type for LangGraph
 */
export type ChannelReducer<T> = { reducer: (a: T, b: T) => T }

/**
 * Common status states for all agents
 */
export const BaseStatusSchema = z.enum([
    'initializing',
    'loading',
    'saving',
    'completed',
    'error'
])

export type BaseStatus = z.infer<typeof BaseStatusSchema>

/**
 * Base configuration for agent runs
 */
export const RunConfigSchema = z.object({
    runId: z.string().uuid(),
    startTime: z.string().datetime(),
    outputDir: z.string(),
    inputDir: z.string(),
    description: z.string().optional()
})

export type RunConfig = z.infer<typeof RunConfigSchema>

/**
 * Information about a run
 */
export const RunInfoSchema = z.object({
    runId: z.string().uuid(),
    startTime: z.string().datetime(),
    outputDir: z.string(),
    inputDir: z.string()
})

export type RunInfo = z.infer<typeof RunInfoSchema>

/**
 * Base result type for agent operations
 */
export const BaseResultSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
    duration: z.number(),
    modelUsed: z.string(),
    tokensUsed: z.number().optional()
})

export type BaseResult = z.infer<typeof BaseResultSchema>

/**
 * Base profile type used across agents
 */
export const BaseProfileSchema = z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.object({
        sourceFile: z.string(),
        loadedAt: z.string().datetime()
    }),
    sourceFile: z.string()
})

export type BaseProfile = z.infer<typeof BaseProfileSchema>

/**
 * Normalized profile schema used by multiple agents
 */
export const NormalizedProfileSchema = z.object({
    id: z.string(),
    name: z.string(),
    sourceProfileId: z.string(),
    content: z.string(),
    normalizedFields: z.record(z.unknown())
})

export type NormalizedProfile = z.infer<typeof NormalizedProfileSchema>

/**
 * Base summary schema for agent runs
 */
export const BaseSummarySchema = z.object({
    totalProfiles: z.number(),
    successCount: z.number(),
    errorCount: z.number(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    duration: z.number(),
    errors: z.array(z.string())
})

export type BaseSummary = z.infer<typeof BaseSummarySchema>
