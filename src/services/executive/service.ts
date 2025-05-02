/**
 * @file ExecutiveService
 *
 * @description
 * The ExecutiveService is the central orchestrator for executing an Effect
 * representing an AI operation or pipeline step. It enforces policy checks,
 * applies execution constraints (such as retries and token limits), and
 * handles audit logging around the execution of the Effect.
 *
 * - It does not implement AI logic itself, but wraps the execution of Effects
 *   provided by Producer Services (e.g., TextService, ImageService).
 * - It serves as the Policy Enforcement Point (PEP), ensuring all executions
 *   comply with configured policies and operational controls.
 * - It is responsible for recording outcomes and audit logs via dedicated
 *   services, supporting observability and compliance.
 * - All orchestration is performed using Effect-TS idioms for type safety,
 *   composability, and robust async execution.
 */

// Core imports
import { Effect, pipe, Schedule, Ref, Option } from "effect";

// Policy service for enforcing usage constraints
import { PolicyService } from "@/services/ai/policy/service.js";
import TextService from "@/services/ai/producers/text/service.js";
import type { PolicyCheckContext, PolicyRecordContext } from "@/services/ai/policy/types.js";

// Service API and error types
import type { ExecutiveServiceApi, BaseExecuteOptions, TextExecuteOptions } from "./api.js";
import { DEFAULT_EXECUTE_OPTIONS } from "./api.js";

import { ExecutiveServiceError } from "./errors.js";

/**
 * ExecutiveService implementation using Effect.Service pattern.
 * Follows project architectural rules for service definition.
 */
export class ExecutiveService extends Effect.Service<ExecutiveServiceApi>()(
  "ExecutiveService",
  {
    effect: Effect.gen(function* () {
      /**
       * Execute a generic Effect with policy enforcement and constraints.
       * Before executing the effect, it checks with PolicyService if the operation is allowed.
       * If the policy check fails, an ExecutiveServiceError is thrown.
       * Otherwise, the provided effect is executed.
       */
      const execute = <R, E, A>(
        effect: Effect.Effect<A, E, R>,
        options: BaseExecuteOptions = DEFAULT_EXECUTE_OPTIONS
      ): Effect.Effect<A, E | ExecutiveServiceError, R> =>
        Effect.gen(function* (): Generator<any, A, any> {
          // Get policy service
          const policyService = yield* PolicyService;

          // Create policy check context
          const policyContext: PolicyCheckContext = {
            auth: { userId: "system" }, // Simple default auth for now
            pipelineId: options.pipelineId,
            requestedModel: options.modelId ?? "default",
            operationType: options.operationType ?? "execute",
            tags: options.tags
          };

          // Check policy
          const startTime = Date.now();
          const result = yield* policyService.checkPolicy(policyContext);
          
          if (!result.allowed) {
            // Record blocked outcome
            yield* Effect.forkDaemon(
              policyService.recordOutcome({
                auth: { userId: "system" }, // Simple default auth for now
                pipelineId: options.pipelineId,
                modelUsed: policyContext.requestedModel,
                operationType: policyContext.operationType,
                status: 'blocked',
                latencyMs: Date.now() - startTime,
                tags: options.tags,
                error: {
                  code: 'POLICY_DENIED',
                  message: result.reason || 'Operation not allowed by policy'
                }
              })
            );

            throw new ExecutiveServiceError({
              description: result.reason || "Policy denied this operation",
              module: "services/executive",
              method: "execute"
            });
          }

          // Use provided options or defaults
          const {
            maxAttempts,
            baseDelayMs,
            maxDelayMs
          } = options ?? DEFAULT_EXECUTE_OPTIONS;

          const retrySchedule = pipe(
            Schedule.recurs(maxAttempts - 1),
            Schedule.compose(
              pipe(
                Schedule.exponential(baseDelayMs, 2),
                Schedule.upTo(maxDelayMs)
              )
            )
          );

          // Wrap effect with abort handling
          const abortableEffect = options.signal
            ? pipe(
                effect,
                Effect.interruptible,
                Effect.race(
                  Effect.async<never, Error>((resume, signal) => {
                    const abort = () => resume(Effect.fail(new Error("Operation aborted")));
                    const abortSignal = options.signal!;
                    abortSignal.addEventListener("abort", abort);
                    signal.addEventListener("abort", abort);
                    return Effect.sync(() => {
                      abortSignal.removeEventListener("abort", abort);
                      signal.removeEventListener("abort", abort);
                    });
                  })
                )
              )
            : effect;

          // Create token counter if maxCumulativeTokens is set
          const tokenCounter = options.maxCumulativeTokens
            ? yield* Ref.make(0)
            : null;

          // Execute with retry logic and token tracking
          const executionResult = yield* pipe(
            abortableEffect,
            Effect.flatMap((result: any) => Effect.gen(function* () {
              // If result has token usage info, track it
              if (tokenCounter && 
                  typeof result === 'object' && 
                  result !== null && 
                  'metadata' in result && 
                  result.metadata?.usage?.totalTokens) {
                const currentTotal = yield* tokenCounter.get;
                const newTotal = currentTotal + result.metadata.usage.totalTokens;
                
                // Check if we've exceeded the token limit
                if (options.maxCumulativeTokens && newTotal > options.maxCumulativeTokens) {
                  return yield* Effect.fail(new ExecutiveServiceError({
                    description: `Token limit exceeded: ${newTotal} > ${options.maxCumulativeTokens}`,
                    module: "services/executive",
                    method: "execute"
                  }));
                }
                
                // Update token counter
                yield* Ref.set(newTotal)(tokenCounter);
              }
              return result;
            })),
            Effect.retry(retrySchedule)
          );

          // Get final token usage for policy record
          const tokenUsage = tokenCounter
            ? {
                totalTokens: yield* tokenCounter.get
              }
            : undefined;

          // Record successful outcome
          yield* Effect.forkDaemon(
            policyService.recordOutcome({
              auth: { userId: "system" }, // Simple default auth for now
              pipelineId: options.pipelineId,
              modelUsed: result.effectiveModel,
              operationType: policyContext.operationType,
              status: 'success',
              latencyMs: Date.now() - startTime,
              tags: options.tags,
              usage: tokenUsage
            })
          );

          return executionResult;
        }) as Effect.Effect<A, E | ExecutiveServiceError, R>;

      const executeText = (
        options: TextExecuteOptions
      ) => Effect.gen(function* () {
        const textService = yield* TextService;
        const effect = textService.generate({
          modelId: options.modelId,
          prompt: options.prompt,
          system: options.system ?? Option.none(),
          signal: options.signal,
          parameters: options.parameters
        });

        return yield* execute(effect, {
          maxAttempts: options.maxAttempts,
          baseDelayMs: options.baseDelayMs,
          maxDelayMs: options.maxDelayMs,
          signal: options.signal,
          pipelineId: options.pipelineId,
          tags: options.tags,
          maxCumulativeTokens: options.maxCumulativeTokens,
          operationType: 'text',
          modelId: options.modelId
        });
      });

      return {
        execute,
        executeText
      };
    }),
    dependencies: [PolicyService.Default, TextService.Default] as const
  }
) { }
