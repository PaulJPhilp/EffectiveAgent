import type {
	ImageStatus,
	ImageResult,
	ImageSummary,
	NormalizedProfile
} from './types';
import type { RunConfig } from '../types';

interface Image {
  id: string;
  content: string;
}

/**
 * Represents the state of a normalization run
 */
export interface ImageState {
	readonly runInfo: RunConfig;
	readonly status: ImageStatus;
	readonly normalizedProfiles: readonly NormalizedProfile[];
	readonly images: readonly Image[];
	readonly imageResults: readonly ImageResult[];
	readonly summary: ImageSummary;
}

/**
 * Creates a new state object with updated fields
 * @param currentState Current state object
 * @param updates Partial updates to apply
 * @returns New state object with updates applied
 */
export function updateState(
	currentState: ImageState,
	updates: Partial<ImageState>
): ImageState {
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
): ImageState {
	return {
		runInfo: {
			runId,
			startTime: new Date().toISOString(),
			outputDir,
			inputDir,
		},
		status: 'initializing',
		normalizedProfiles: [],
		images: [],
		imageResults: [],
		summary: {
			totalProfiles: 0,
			successfulGenerations: 0,
			failedGenerations: 0,
			totalDuration: 0,
			totalTokensUsed: 0,
		},
	};
}