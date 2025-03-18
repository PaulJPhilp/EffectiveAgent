/**
 * Result of profile normalization
 */
export interface NormalizationResult {
  readonly profileId: string;
  readonly success: boolean;
  readonly duration: number;
  readonly modelUsed: string;
  readonly tokensUsed: number;
  readonly error?: string;
}

/**
 * Normalized profile data
 */
export interface NormalizedProfile {
  readonly id: string;
  readonly sourceProfileId: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly normalizedFields: Record<string, unknown>;
  readonly confidence: number;
}

/**
 * Raw profile data
 */
export interface ProfileData {
  readonly id: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
}
