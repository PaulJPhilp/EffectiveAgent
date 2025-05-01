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
import { Effect, pipe, Schedule } from "effect";

// Policy service for enforcing usage constraints
import { PolicyService } from "@/services/ai/policy/service.js";

// Service API and error types
import type { ExecutiveServiceApi, ExecuteOptions } from "./api.js";
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
      const execute: ExecutiveServiceApi["execute"] = <R, E, A>(
        effect: Effect.Effect<A, E, R>,
        options: ExecuteOptions = DEFAULT_EXECUTE_OPTIONS
      ): Effect.Effect<A, E | ExecutiveServiceError, R> =>
        Effect.gen(function* (): Generator<any, A, any> {
          const policyService = yield* PolicyService;
          const result = yield* policyService.checkPolicy({
            auth: { userId: "system" },
            requestedModel: "default",
            operationType: "execute"
          });
          const allowed = result.allowed;
          if (!allowed) {
            throw new ExecutiveServiceError({
              description: "Policy denied this operation",
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

          // Execute with retry logic
          return yield* pipe(
            abortableEffect,
            Effect.retry(retrySchedule)
          );
        }) as Effect.Effect<A, E | ExecutiveServiceError, R>;

      return {
        execute
      };
    }),
    dependencies: []
  }
) { }
