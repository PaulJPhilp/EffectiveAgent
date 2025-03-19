import { z } from 'zod';
import type { Document } from '@langchain/core/documents';

/**
 * Represents the status of a normalization run
 */
export const NormalizationStatusSchema = z.enum([
  'initializing',
  'loading',
  'normalizing',
  'saving',
  'completed',
  'error',
]);

export type NormalizationStatus = z.infer<typeof NormalizationStatusSchema>;

/**
 * Represents information about a normalization run
 */
export const RunInfoSchema = z.object({
  runId: z.string().uuid(),
  startTime: z.string().datetime(),
  outputDir: z.string(),
  inputDir: z.string(),
});

export type RunInfo = z.infer<typeof RunInfoSchema>;

/**
 * Represents a profile's data and metadata
 */
export const ProfileDataSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.object({
    sourceFile: z.string(),
    loadedAt: z.string().datetime(),
  }),
  sourceFile: z.string(),
});

export type ProfileData = z.infer<typeof ProfileDataSchema>;

/**
 * Represents a normalized profile with structured data
 */
export const NormalizedProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceProfileId: z.string(),
  content: z.string(),
  normalizedFields: z.record(z.unknown()),
});

export type NormalizedProfile = z.infer<typeof NormalizedProfileSchema>;

/**
 * Represents the result of normalizing a single profile
 */
export const NormalizationResultSchema = z.object({
  profileId: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
  duration: z.number(),
  modelUsed: z.string(),
  tokensUsed: z.number().optional(),
});

export type NormalizationResult = z.infer<typeof NormalizationResultSchema>;

/**
 * Summary statistics for a normalization run
 */
export const NormalizationSummarySchema = z.object({
  totalProfiles: z.number(),
  successfulNormalizations: z.number(),
  failedNormalizations: z.number(),
  totalDuration: z.number(),
  totalTokensUsed: z.number(),
  completedAt: z.string().datetime().optional(),
});

export type NormalizationSummary = z.infer<typeof NormalizationSummarySchema>;
