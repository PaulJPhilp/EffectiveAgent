// File: src/shared/services-effect/skill/skillService.ts

import { Effect, Layer } from "effect";
import type { JSONObject } from '../../../types.js';
import type { ModelService } from '../model/types.js';
import { ModelService as ModelServiceTag } from '../model/types.js';
import type { PromptService } from '../prompt/types.js';
import { PromptService as PromptServiceTag } from '../prompt/types.js';
import { SkillExecutionError, SkillModelError, SkillPromptError } from './errors.js';
import type {
  SkillConfigurationService,
  SkillExecutionOptions,
  SkillExecutionResult,
  SkillService
} from './types.js';
import { SkillConfigurationService as SkillConfigServiceTag, SkillService as SkillServiceTag } from './types.js';

// --- Service Implementation Object Factory ---
const makeSkillService = (
  configService: SkillConfigurationService,
  modelService: ModelService,
  promptService: PromptService
): SkillService => {
  return {
    executeSkill: <T extends JSONObject = JSONObject>(
      options: SkillExecutionOptions<T>
    ) => {
      return Effect.gen(function* ($) {
        const startTime = Date.now();

        // Get skill configuration
        const skillConfig = yield* $(configService.getSkillConfig(options.skillId));

        // Render the prompt
        const renderedPrompt = yield* $(
          promptService.renderPrompt(skillConfig.promptId, {
            variables: options.variables ?? {},
            validateVariables: options.validateVariables
          }).pipe(
            Effect.mapError(error => new SkillPromptError({
              message: error.message,
              skillId: options.skillId,
              promptId: skillConfig.promptId,
              cause: error
            }))
          )
        );

        // Execute the model
        const modelResult = yield* $(
          modelService.generateText({
            modelId: skillConfig.modelId,
            prompt: renderedPrompt,
            temperature: options.modelOptions?.temperature ?? skillConfig.modelOptions?.temperature,
            maxTokens: options.modelOptions?.maxTokens ?? skillConfig.modelOptions?.maxTokens
          }).pipe(
            Effect.mapError(error => new SkillModelError({
              message: error.message,
              skillId: options.skillId,
              modelId: skillConfig.modelId,
              cause: error
            }))
          )
        );

        // Parse output based on format
        let parsedOutput: T;
        try {
          switch (skillConfig.outputFormat) {
            case 'json':
              parsedOutput = JSON.parse(modelResult.content) as T;
              break;
            case 'text':
            case 'markdown':
            case 'code':
            default:
              parsedOutput = { text: modelResult.content } as unknown as T;
              if (!('text' in parsedOutput)) {
                throw new Error('Invalid text output format');
              }
          }
        } catch (error) {
          throw new SkillExecutionError({
            message: `Failed to parse ${skillConfig.outputFormat} output`,
            skillId: options.skillId,
            cause: error
          });
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Return result
        return {
          skillId: options.skillId,
          output: parsedOutput,
          rawOutput: modelResult.content,
          duration,
          modelTokens: modelResult.tokens ? {
            input: modelResult.tokens.prompt,
            output: modelResult.tokens.completion,
            total: modelResult.tokens.total
          } : undefined
        } satisfies SkillExecutionResult<T>;
      });
    }
  };
};

// --- Service Layer Definition ---
export const SkillServiceLive = Layer.effect(
  SkillServiceTag,
  Effect.map(
    Effect.all([
      SkillConfigServiceTag,
      ModelServiceTag,
      PromptServiceTag
    ]),
    ([configService, modelService, promptService]) =>
      makeSkillService(configService, modelService, promptService)
  )
);
