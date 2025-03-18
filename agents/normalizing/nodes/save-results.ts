import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { RunnableFunc } from '@langchain/core/runnables';
import type { NormalizationState } from '../state';
import type { NormalizedProfile, NormalizationResult } from '../types';

/**
 * Handles saving normalized profiles and results
 */
export class ResultsSaver {
  /**
   * Creates output directories if they don't exist
   * @param outputDir Base output directory
   */
  private async ensureDirectories(outputDir: string): Promise<void> {
    await mkdir(join(outputDir, 'profiles'), { recursive: true });
    await mkdir(join(outputDir, 'results'), { recursive: true });
  }

  /**
   * Saves a normalized profile to JSON file
   * @param profile Normalized profile to save
   * @param outputDir Output directory
   */
  private async saveProfile(
    profile: NormalizedProfile,
    outputDir: string
  ): Promise<void> {
    const filePath = join(outputDir, 'profiles', `${profile.id}.json`);
    await writeFile(filePath, JSON.stringify(profile, null, 2));
  }

  /**
   * Saves normalization results to JSON file
   * @param results Array of normalization results
   * @param outputDir Output directory
   * @param runId Run identifier
   */
  private async saveResults(
    results: readonly NormalizationResult[],
    outputDir: string,
    runId: string
  ): Promise<void> {
    const filePath = join(outputDir, 'results', `${runId}.json`);
    await writeFile(filePath, JSON.stringify(results, null, 2));
  }

  /**
   * Saves all profiles and results from a normalization run
   * @param profiles Array of normalized profiles
   * @param results Array of normalization results
   * @param outputDir Output directory
   * @param runId Run identifier
   */
  public async saveAll(
    profiles: readonly NormalizedProfile[],
    results: readonly NormalizationResult[],
    outputDir: string,
    runId: string
  ): Promise<void> {
    await this.ensureDirectories(outputDir);

    const savePromises = [
      ...profiles.map((profile) => this.saveProfile(profile, outputDir)),
      this.saveResults(results, outputDir, runId),
    ];

    await Promise.all(savePromises);
  }
}

/**
 * Node handler for saving normalization results
 * @param state Current normalization state
 * @returns Updated state with saved results
 */
export const saveResultsNode: RunnableFunc<NormalizationState, NormalizationState> = async (
  state: NormalizationState
): Promise<NormalizationState> => {
  const saver = new ResultsSaver();
  
  await saver.saveAll(
    state.normalizedProfiles,
    state.normalizationResults,
    state.runInfo.outputDir,
    state.runInfo.runId
  );

  return {
    ...state,
    status: 'completed',
    summary: {
      ...state.summary,
      completedAt: new Date().toISOString(),
    },
  };
};
