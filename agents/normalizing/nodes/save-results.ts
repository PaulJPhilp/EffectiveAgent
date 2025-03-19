import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { RunnableFunc } from '@langchain/core/runnables';
import type { NormalizationState } from '../state';
import type { NormalizedProfile, NormalizationResult } from '../types';
import chalk from 'chalk';
import fs from 'fs';
import assert from 'assert';

/**
 * Handles saving normalized profiles and results
 */
export class ResultsSaver {
  private readonly debug: boolean = false;
  private readonly state: NormalizationState;
  private readonly rootDir: string;

  constructor(state: NormalizationState) {
    this.state = state;
    const dirName = new Date().toISOString().replace(/:/g, '-') + '-' + state.runInfo.runId;
    this.rootDir = join(state.runInfo.outputDir, dirName);

  }

  /**
   * Creates output directories if they don't exist
   */
  private async ensureDirectories(): Promise<void> {
    if (!fs.existsSync(this.rootDir)) await mkdir(this.rootDir, { recursive: true });
    if (!fs.existsSync(join(this.rootDir, 'profiles'))) await mkdir(join(this.rootDir, 'profiles'), { recursive: true });
    if (!fs.existsSync(join(this.rootDir, 'results'))) await mkdir(join(this.rootDir, 'results'), { recursive: true });
  }

  /**
   * Saves a normalized profile to JSON file
   * @param profile Normalized profile to save
   */
  private async saveProfile(
    profile: NormalizedProfile
  ): Promise<void> {
    if (this.debug) console.log(`Saving profile ${chalk.blue(profile.name)} to \n${this.rootDir}/profiles/${profile.name}.json`);
    const filePath = join(this.rootDir, 'profiles', `${profile.name}.json`);
    await writeFile(filePath, JSON.stringify(profile, null, 2));
  }

  /**
   * Saves normalization results to JSON file
   * @param results Array of normalization results
   */
  private async saveResults(
    results: readonly NormalizationResult[]
  ): Promise<void> {
    const filePath = join(this.rootDir, 'results', `${this.state.runInfo.runId}.json`);
    if (this.debug) console.log(`Saving results to ${filePath}`);
    await writeFile(filePath, JSON.stringify(results, null, 2));
  }

  /**
   * Saves all profiles and results from a normalization run
   * @param profiles Array of normalized profiles
   * @param results Array of normalization results
   */
  public async saveAll(
    profiles: readonly NormalizedProfile[],
    results: readonly NormalizationResult[]
  ): Promise<void> {
    if (this.debug) console.log(`Saving all profiles and results to ${this.rootDir}`);
    await this.ensureDirectories();

    assert(profiles.length !== 0, 'No profiles to save')
    assert(results.length !== 0, 'No results to save')

    const savePromises = [
      ...profiles.map((profile) => this.saveProfile(profile)),
      this.saveResults(results),
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
  const saver = new ResultsSaver(state);

  try {
    await saver.saveAll(
      state.normalizedProfiles,
      state.normalizationResults
    );
  } catch (error) {
    console.error('Error saving results:', error);
    throw error;
  }

  return {
    ...state,
    status: 'completed',
    summary: {
      ...state.summary,
      completedAt: new Date().toISOString(),
    },
  };
}