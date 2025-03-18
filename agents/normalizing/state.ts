import type { StateGraph } from '@langchain/langgraph';
import type {
  NormalizationStatus,
  ProfileData,
  NormalizedProfile,
  NormalizationResult,
  NormalizationSummary,
  RunInfo,
} from './types';

/**
 * Represents the state of a normalization run
 */
export interface NormalizationState {
  readonly runInfo: RunInfo;
  readonly status: NormalizationStatus;
  readonly profiles: readonly ProfileData[];
  readonly normalizedProfiles: readonly NormalizedProfile[];
  readonly normalizationResults: readonly NormalizationResult[];
  readonly summary: NormalizationSummary;
}

/**
 * Creates a new state object with updated fields
 * @param currentState Current state object
 * @param updates Partial updates to apply
 * @returns New state object with updates applied
 */
export function updateState(
  currentState: NormalizationState,
  updates: Partial<NormalizationState>
): NormalizationState {
  return {
    ...currentState,
    ...updates,
  };
}

/**
 * Creates an initial state object for a new normalization run
 * @param runId Optional run ID, defaults to random UUID
 * @param outputDir Optional output directory, defaults to 'data/normalized'
 * @param inputDir Optional input directory, defaults to 'data/raw'
 * @returns Initial state object
 */
export function createInitialState(
  runId: string = crypto.randomUUID(),
  outputDir: string = 'output/normalize',
  inputDir: string = 'data/raw'
): NormalizationState {
  return {
    runInfo: {
      runId,
      startTime: new Date().toISOString(),
      outputDir,
      inputDir,
    },
    status: 'initializing',
    profiles: [],
    normalizedProfiles: [],
    normalizationResults: [],
    summary: {
      totalProfiles: 0,
      successfulNormalizations: 0,
      failedNormalizations: 0,
      totalDuration: 0,
      totalTokensUsed: 0,
    },
  };
}
