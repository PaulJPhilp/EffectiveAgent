import type { RunConfig } from '../types';
import type {
  AgentConfig,
  BasicClusteringResult,
  ElaboratedPersona,
  FullPersona,
  NormalizedProfile
} from './types.js';

/**
 * Define the state for our persona agent graph
 */
export interface ClusteringState {
  readonly config: AgentConfig;
  readonly runInfo: RunConfig;
  readonly normalizedProfiles: NormalizedProfile[];
  readonly basicClusters: BasicClusteringResult;
  readonly currentClusterIndex: number;
  readonly inputPersona: Partial<FullPersona>;
  readonly elaboratedPersonas: Partial<ElaboratedPersona>[];
  readonly error: string;
  readonly status: string;
  readonly completedSteps: string[];
  readonly logs: string[];
  readonly recommendations: string[];
  readonly errorCount: number;
}

export function updateState(
  currentState: ClusteringState,
  updates: Partial<ClusteringState>
): ClusteringState {
  return {
    ...currentState,
    ...updates,
  };
}

/**
 * Creates an initial state object for a new persona generation run
 * @param runInfo Run configuration
 * @returns Initial state object
 */
export function createInitialState(
  runId: string = crypto.randomUUID(),
  outputDir: string,
  inputDir: string,
  config: AgentConfig
): ClusteringState {
  return {
    config,
    runInfo: {
      runId,
      startTime: new Date().toISOString(),
      outputDir,
      inputDir,
    },
    status: 'initializing',
    normalizedProfiles: [],
    basicClusters: {
      clusters: [],
      analysis: '',
      totalProfiles: 0,
      date: new Date().toISOString()
    },
    currentClusterIndex: 0,
    inputPersona: {},
    elaboratedPersonas: [],
    error: '',
    completedSteps: [],
    logs: [],
    recommendations: [],
    errorCount: 0
  };
}