import fs from 'fs';
import { join } from 'path';
import type { RunnableFunc } from '@langchain/core/runnables';
import type { ImageState } from '../state';
import type { NormalizedProfile, RunConfig } from '../types';

/**
 * Loads profile data from  JSON files in the input directory
 */
export class NormalizedProfileLoader {
  private readonly debug: boolean = true;
  private readonly runConfig: RunConfig;

  constructor(runConfig: RunConfig) {
    this.runConfig = runConfig;
  }

  private loadProfile(profileName: string): NormalizedProfile {
    const filePath = join(process.cwd(), this.runConfig.inputDir, 'normalized', profileName);
    if (this.debug) {
      console.log(`Loading profile from ${filePath}`);
    }
    const data = fs.readFileSync(filePath);
    const content = data.toString();
    const profile = JSON.parse(content) as NormalizedProfile;
    return profile;
  }


  /**
   * Loads all JSON files from a directory
   * @param inputDir Directory containing JSON files
   * @returns Array of profile data objects
   */
  public loadNormalizedProfiles(): NormalizedProfile[] {
    const inputDir = join(process.cwd(), this.runConfig.inputDir, 'normalized');
    try {
      const profileNames = fs.readdirSync(inputDir);
      if (this.debug) {
        console.log(`Found ${profileNames.length} files in ${inputDir}`);
      }

      return profileNames.map((profileName) => this.loadProfile(profileName));
    } catch (error) {
      if (this.debug) {
        console.error(`Failed to load profiles from ${inputDir}: ${error}`);
      }
      throw new Error(`Failed to load profiles from ${inputDir}: ${error}`);
    }
  }
}

/**
 * Node handler for loading profiles from JSON files
 * @param state Current image state
 * @returns Updated state with loaded profiles
 */
export const loadProfilesNode: RunnableFunc<ImageState, ImageState> = async (
  state: ImageState
): Promise<ImageState> => {
  console.log('Loading normalized profiles...');
  console.log(state)
  const loader = new NormalizedProfileLoader(state.runInfo);
  const normalizedProfiles = loader.loadNormalizedProfiles();

  return {
    ...state,
    status: 'loading',
    normalizedProfiles,
    summary: {
      ...state.summary,
      totalProfiles: normalizedProfiles.length,
    },
  };
};
