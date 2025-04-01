// File: src/shared/services-effect/prompt/promptService.ts

import { Effect, Layer } from "effect";
import { Liquid } from 'liquidjs';
import type { PromptService, PromptConfigurationService, PromptRenderOptions } from './types.js';
import { PromptConfigurationService as PromptConfigurationServiceTag, PromptService as PromptServiceTag } from './types.js';
import { PromptRenderingError, PromptVariableMissingError } from './errors.js';

// --- Service Implementation Object Factory ---
const makePromptService = (
  configService: PromptConfigurationService
): PromptService => {
  const liquid = new Liquid({
    strictVariables: true,
    strictFilters: true
  });

  const validateVariables = (
    _template: string,
    requiredVars: ReadonlyArray<string>,
    variables: Record<string, unknown>,
    promptId?: string
  ): Effect.Effect<void, PromptVariableMissingError> => {
    const missingVars = requiredVars.filter(v => !(v in variables));
    if (missingVars.length > 0) {
      return Effect.fail(new PromptVariableMissingError({
        missingVariables: missingVars,
        promptId
      }));
    }
    return Effect.succeed(void 0);
  };

  const renderTemplateInternal = (
    template: string,
    variables: Record<string, unknown>
  ): Effect.Effect<string, PromptRenderingError> => {
    return Effect.tryPromise({
      try: () => liquid.parseAndRender(template, variables),
      catch: (error) => new PromptRenderingError({
        template,
        variables,
        cause: error
      })
    });
  };

  return {
    renderPrompt: (promptId: string, options: PromptRenderOptions) => {
      return Effect.gen(function* (_) {
        const template = yield* _(configService.getPromptTemplate(promptId));

        if (options.validateVariables !== false && template.requiredVariables) {
          yield* _(validateVariables(
            template.template,
            template.requiredVariables,
            options.variables,
            promptId
          ));
        }

        const rendered = yield* _(renderTemplateInternal(
          template.template,
          options.variables
        ).pipe(
          Effect.mapError(error => new PromptRenderingError({
            ...error,
            promptId
          }))
        ));

        return rendered;
      });
    },

    renderTemplate: (template: string, options: PromptRenderOptions) => {
      return renderTemplateInternal(template, options.variables);
    }
  };
};

// --- Service Layer Definition ---
export const PromptServiceLive = Layer.effect(
  PromptServiceTag,
  Effect.map(PromptConfigurationServiceTag, configService => makePromptService(configService))
);
