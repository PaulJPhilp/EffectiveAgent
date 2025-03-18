import { END, START, StateGraph, type StateGraphArgs } from '@langchain/langgraph';
import type { NormalizationState } from './state';
import { createInitialState } from './state';

import {
  initializeRunNode,
  loadProfilesNode,
  normalizeProfilesNode,
  saveResultsNode,
} from './nodes';
import { join } from 'path';
import { type ChannelReducer } from '../types';
import * as fs from 'fs';

interface NormalizationStateChannels {
  readonly runInfo: ChannelReducer<NormalizationState['runInfo']>;
  readonly status: ChannelReducer<NormalizationState['status']>;
  readonly profiles: ChannelReducer<NormalizationState['profiles']>;
  readonly normalizedProfiles: ChannelReducer<NormalizationState['normalizedProfiles']>;
  readonly normalizationResults: ChannelReducer<NormalizationState['normalizationResults']>;
  readonly summary: ChannelReducer<NormalizationState['summary']>;
}
/**
 * Represents a normalizing agent that processes and structures profile data
 */
export class NormalizingAgent {
  private readonly graph: ReturnType<typeof this.createGraph>;
  private readonly config: Promise<Record<string, unknown>>;

  constructor({ configPath }: { configPath: string }) {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    this.graph = this.createGraph();
  }

  /**
   * Creates and configures the normalization graph
   * @returns Compiled state graph
   */
  private createGraph() {
    const initialState = createInitialState();
    const channels = {
      runInfo: { reducer: (a, b) => ({ ...a, ...b }) },
      status: { reducer: (a, b) => b },
      profiles: { reducer: (a, b) => [...a, ...b] },
      normalizedProfiles: { reducer: (a, b) => [...a, ...b] },
      normalizationResults: { reducer: (a, b) => [...a, ...b] },
      summary: { reducer: (a, b) => ({ ...a, ...b }) },
    };
    const graph = new StateGraph<NormalizationState>({ channels })
      .addNode('initialize_run', initializeRunNode)
      .addEdge(START, 'initialize_run')
      .addNode('load_profiles', loadProfilesNode)
      .addEdge('initialize_run', 'load_profiles')
      .addNode('normalize_profiles', normalizeProfilesNode)
      .addEdge('load_profiles', 'normalize_profiles')
      .addNode('save_results', saveResultsNode)
      .addEdge('normalize_profiles', 'save_results')
      .addEdge('save_results', END);

    return graph.compile();
  }

  /**
   * Runs the normalization process
   * @param inputDir Directory containing PDF files to process
   * @param outputDir Output directory for normalized profiles
   * @returns Final state after normalization
   */
  public async run(
    inputDir: string,
    outputDir: string
  ): Promise<NormalizationState> {
    try {
      const initialState = createInitialState(undefined, outputDir, inputDir);
      const result = await this.graph.invoke(initialState);

      return {
        ...initialState,
        ...result,
      } as NormalizationState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Normalization failed: ${errorMessage}`);
    }
  }
}
