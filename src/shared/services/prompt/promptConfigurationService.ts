// File: src/shared/services-effect/prompt/promptConfigurationService.ts

import { Effect, Layer, HashMap } from "effect";
import type { PromptTemplate, PromptConfigFile } from './schema.js';
import { PromptConfigurationService, PromptConfigFileTag } from './types.js';
import { PromptNotFoundError } from './errors.js';

// --- Service Implementation Object Factory ---
const makePromptConfigurationService = (
  promptConfigFile: PromptConfigFile
): PromptConfigurationService => {
  if (!promptConfigFile || !Array.isArray(promptConfigFile.prompts)) {
    throw new Error("Invalid or missing PromptConfigFile provided");
  }

  let promptsMap = HashMap.empty<string, PromptTemplate>();
  const tempList: PromptTemplate[] = [];
  const categoryMap = new Map<string, PromptTemplate[]>();

  promptConfigFile.prompts.forEach((prompt: PromptTemplate) => {
    const promptId = prompt.id;
    if (HashMap.has(promptsMap, promptId)) {
      Effect.logWarning(`[PromptConfigurationService] Duplicate prompt ID: ${promptId}. Using first occurrence.`);
    } else {
      promptsMap = HashMap.set(promptsMap, promptId, prompt);
      tempList.push(prompt);

      if (prompt.category) {
        if (!categoryMap.has(prompt.category)) {
          categoryMap.set(prompt.category, []);
        }
        categoryMap.get(prompt.category)?.push(prompt);
      }
    }
  });

  const finalPromptsMap = promptsMap;
  const promptList: ReadonlyArray<PromptTemplate> = Object.freeze([...tempList]);
  const categoriesMap = new Map<string, ReadonlyArray<PromptTemplate>>(
    Array.from(categoryMap.entries()).map(([category, prompts]) => [
      category,
      Object.freeze([...prompts])
    ])
  );

  return {
    getPromptTemplate: (promptId: string): Effect.Effect<PromptTemplate, PromptNotFoundError> => {
      return Effect.sync(() => HashMap.get(finalPromptsMap, promptId)).pipe(
        Effect.flatMap(maybePrompt =>
          maybePrompt._tag === "Some"
            ? Effect.succeed(maybePrompt.value)
            : Effect.fail(new PromptNotFoundError({ promptId }))
        )
      );
    },

    listPrompts: (): Effect.Effect<ReadonlyArray<PromptTemplate>> => {
      return Effect.succeed(promptList);
    },

    findPromptsByCategory: (category: string): Effect.Effect<ReadonlyArray<PromptTemplate>> => {
      return Effect.sync(() => categoriesMap.get(category) ?? []);
    }
  };
};

// --- Service Layer Definition ---
export const PromptConfigurationServiceLive = Layer.effect(
  PromptConfigurationService,
  Effect.map(PromptConfigFileTag, configFile => makePromptConfigurationService(configFile))
);
