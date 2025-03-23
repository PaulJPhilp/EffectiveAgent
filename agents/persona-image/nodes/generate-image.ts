import type { RunnableFunc } from '@langchain/core/runnables';
import type { ImageState } from '../state';
import type {
  NormalizedProfile,
  ImageResult,
} from '../types';
import { TaskService } from '../../../shared/services/task/taskService';
import { randomUUID } from 'crypto';
import { chunkArray } from '../../utils';
import { extractJsonFromResponse } from '../../utils';

/**
 * Handles profile normalization using LLM models
 */
export class ImageGenerator {
  private readonly debug: boolean = false;
  private readonly taskService: TaskService;
  private readonly state: ImageState;

  constructor(state: ImageState) {
    if (this.debug) console.log(`[ImageGenerator] Initializing with config path: ${process.cwd()}/agents/persona-image/config`);
    this.taskService = new TaskService({
      configPath: process.cwd() + '/agents/persona-image/config',
    });
    if (this.debug) console.log(`[ImageGenerator] Task service initialized`);
    this.state = state;
  }

  /**
   * Generates a single image using the configured LLM
   * @param profile Profile data to generate image for
   * @returns Image result and normalized profile
   */
  private async generateImage(profile: NormalizedProfile): Promise<{
    readonly result: ImageResult;
    readonly normalizedProfile: NormalizedProfile | null;
  }> {
    const startTime = Date.now();

    try {
      if (this.debug) console.log(`Generating image for profile ${profile.id}`);
      const taskResult = await this.taskService.executeTask('generate-image', {
        variables: {
          input_profile: JSON.stringify(profile)
        },
        format: 'image' // Specify format at top level for image generation
      });

      if (this.debug) console.log(`Completed image generation for profile ${profile.id}`);

      // Since we specified format: 'image', the response will have an image URL
      if (!taskResult.result) {
        throw new Error('No image generated');
      }

      const imageResult: ImageResult = {
        profileId: profile.id,
        success: true,
        duration: Date.now() - startTime,
        modelUsed: taskResult.modelId ?? 'unknown',
        tokensUsed: taskResult.usage?.totalTokens ?? 0,
        imageUrl: taskResult.result // The image URL from the response
      };

      // Return the original profile with the image result
      return { result: imageResult, normalizedProfile: profile };
    } catch (error) {
      if (this.debug) console.error(`Failed to generate image for profile ${profile.id}: ${error}`);
      const imageResult: ImageResult = {
        profileId: profile.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        modelUsed: 'gpt-4-turbo-preview',
        tokensUsed: 0,
      };

      return { result: imageResult, normalizedProfile: null };
    }
  }

  /**
   * Generates multiple images in parallel
   * @returns Arrays of results and normalized profiles
   */
  public async generateImages(): Promise<{
    readonly results: readonly ImageResult[];
    readonly images: readonly NormalizedProfile[];
  }> {

    const profiles = this.state.normalizedProfiles;
    const chunkSize = 2;
    const chunks = chunkArray<Readonly<NormalizedProfile>>(profiles, chunkSize);
    const outcomes: {
      readonly result: ImageResult;
      readonly normalizedProfile: NormalizedProfile | null;
    }[] = [];

    for (const batch of chunks) {
      const batchResults = await Promise.all(
        batch.map(profile => this.generateImage(profile))
      )
      outcomes.push(...batchResults);
      if (this.debug) console.log("Batch results:", outcomes.length);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return {
      results: outcomes.map((outcome) => outcome.result),
      images: outcomes
        .map((outcome) => outcome.normalizedProfile)
        .filter((profile): profile is NormalizedProfile => profile !== null),
    };
  }
}

/**
 * Node handler for generating images from normalized profiles
 * @param state Current image state
 * @returns Updated state with normalized profiles
 */
export const generateImageNode: RunnableFunc<ImageState, ImageState> = async (
  state: ImageState
): Promise<ImageState> => {
  const generator = new ImageGenerator(state);
  const { results, images } = await generator.generateImages();

  const successfulNormalizations = results.filter((result) => result.success).length;

  return {
    ...state,
    status: 'saving',
    images,
    summary: {
      ...state.summary,
      successfulGenerations: successfulNormalizations,
      failedGenerations: state.normalizedProfiles.length - successfulNormalizations,
      totalDuration: results.reduce((sum, result) => sum + result.duration, 0),
      totalTokensUsed: results.reduce(
        (sum, result) => sum + (result.tokensUsed ?? 0),
        0
      ),
    },
  };
}