import type { RunnableFunc } from '@langchain/core/runnables';
import type { NormalizationState } from '../state';
import type {
  NormalizedProfile,
  NormalizationResult,
  ProfileData
} from '../types';
import { TaskService } from '../../../shared/services/task/taskService';
import { randomUUID } from 'crypto';
import { chunkArray } from '../../utils';
import { extractJsonFromResponse } from '../../utils';

/**
 * Handles profile normalization using LLM models
 */
export class ProfileNormalizer {
  private readonly debug: boolean = false;
  private readonly taskService: TaskService;
  private readonly state: NormalizationState;

  constructor(state: NormalizationState) {
    if (this.debug) console.log(`[ProfileNormalizer] Initializing with config path: ${process.cwd()}/agents/normalizing/config`);
    this.taskService = new TaskService({
      configPath: process.cwd() + '/agents/normalizing/config',
    });
    if (this.debug) console.log(`[ProfileNormalizer] Task service initialized`);
    this.state = state;
  }

  /**
   * Normalizes a single profile using the configured LLM
   * @param profile Profile data to normalize
   * @returns Normalization result and normalized profile
   */
  private async normalizeProfile(profile: ProfileData): Promise<{
    readonly result: NormalizationResult;
    readonly normalizedProfile: NormalizedProfile | null;
  }> {
    const startTime = Date.now();

    try {
      if (this.debug) console.log(`Normalizing profile ${profile.id}`);
      const taskResult = await this.taskService.executeTask('normalize-text', {
        variables: {
          input_profile: profile.content
        },
        format: 'json' // Specify format at top level
      });

      if (this.debug) console.log(`Completed normalizing profile ${profile.id}`);

      const jsonContent = extractJsonFromResponse(taskResult.result);
      const normalizedProfile: NormalizedProfile = JSON.parse(jsonContent) as NormalizedProfile;
      normalizedProfile.id = randomUUID();
      normalizedProfile.sourceProfileId = profile.id;

      const normalizationResult: NormalizationResult = {
        profileId: profile.id,
        success: true,
        duration: Date.now() - startTime,
        modelUsed: 'gpt-4-turbo-preview',
        tokensUsed: 0
      };

      return { result: normalizationResult, normalizedProfile };
    } catch (error) {
      if (this.debug) console.error(`Failed to normalize profile ${profile.id}: ${error}`);
      const normalizationResult: NormalizationResult = {
        profileId: profile.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        modelUsed: 'gpt-4-turbo-preview',
        tokensUsed: 0,
      };

      return { result: normalizationResult, normalizedProfile: null };
    }
  }

  /**
   * Normalizes multiple profiles in parallel
   * @returns Arrays of results and normalized profiles
   */
  public async normalizeProfiles(): Promise<{
    readonly results: readonly NormalizationResult[];
    readonly normalizedProfiles: readonly NormalizedProfile[];
  }> {

    const profiles = this.state.profiles;
    const chunkSize = 2;
    const chunks = chunkArray<Readonly<ProfileData>>(profiles, chunkSize);
    const outcomes: {
      readonly result: NormalizationResult;
      readonly normalizedProfile: NormalizedProfile | null;
    }[] = [];

    for (const batch of chunks) {
      const batchResults = await Promise.all(
        batch.map(profile => this.normalizeProfile(profile))
      )
      outcomes.push(...batchResults);
      if (this.debug) console.log("Batch results:", outcomes.length);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return {
      results: outcomes.map((outcome) => outcome.result),
      normalizedProfiles: outcomes
        .map((outcome) => outcome.normalizedProfile)
        .filter((profile): profile is NormalizedProfile => profile !== null),
    };
  }
}

/**
 * Node handler for normalizing profiles using LLM
 * @param state Current normalization state
 * @returns Updated state with normalized profiles
 */
export const normalizeProfilesNode: RunnableFunc<NormalizationState, NormalizationState> = async (
  state: NormalizationState
): Promise<NormalizationState> => {
  const normalizer = new ProfileNormalizer(state);
  const { results, normalizedProfiles } = await normalizer.normalizeProfiles();

  const successfulNormalizations = results.filter((result) => result.success).length;

  return {
    ...state,
    status: 'saving',
    normalizedProfiles,
    normalizationResults: results,
    summary: {
      ...state.summary,
      successfulNormalizations,
      failedNormalizations: state.profiles.length - successfulNormalizations,
      totalDuration: results.reduce((sum, result) => sum + result.duration, 0),
      totalTokensUsed: results.reduce(
        (sum, result) => sum + (result.tokensUsed ?? 0),
        0
      ),
    },
  };
}

