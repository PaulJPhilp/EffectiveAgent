/**
 * @file Implements the PolicyService.
 */

import { Effect, HashMap, Option, Ref } from "effect";
import { v4 as uuidv4 } from "uuid";
import {
  PolicyError
} from "./errors.js";
import {
  PolicyRuleData,
  PolicyRuleEntity,
  PolicyUsageData,
  PolicyUsageEntity
} from "./schema.js";
import {
  POLICY_RULE_ALLOW,
  POLICY_RULE_DENY,
  POLICY_SCOPE_GLOBAL,
  POLICY_SCOPE_USER,
  PolicyCheckContext,
  PolicyCheckResult,
  PolicyRecordContext,
  PolicyRuleType,
  PolicyScope
} from "./types.js";

import { PolicyServiceApi } from "./api.js";

/**
 * PolicyService provides in-memory policy rule management, rate limiting, and
 * policy outcome recording for AI operations. All state is stored in-memory for
 * testability and fast access. Not suitable for production persistence.
 *
 * @remarks
 * - All methods return Effect-TS Effects with proper error typing.
 * - Use resetAll() for test harnesses to clear state.
 */
export class PolicyService extends Effect.Service<PolicyServiceApi>()("PolicyService", {
  effect: Effect.gen(function* () {
    const ruleRepo = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());
    const usageRepo = yield* Ref.make(HashMap.empty<string, PolicyUsageEntity>());
    const rateLimitRepo = yield* Ref.make(HashMap.empty<string, { count: number, windowStart: number }>());

    return {
      /**
 * Checks if the given operation is allowed under current policy rules and rate limits.
 *
 * @param context - The policy check context (user, operation, model, etc.)
 * @returns Effect yielding PolicyCheckResult or PolicyError
 */
      checkPolicy: (context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);

          if (HashMap.isEmpty(rules)) {
            return {
              allowed: true,
              effectiveModel: context.requestedModel
            };
          }

          const matchingRules = Array.from(HashMap.values(rules))
            .filter(rule => {
              const entity = rule as PolicyRuleEntity
              const resourceMatch = entity.data.resource === context.operationType;
              const enabled = entity.data.enabled;
              return enabled && resourceMatch;
            });

          // Check rate limits
          for (const rule of matchingRules) {
            const entity = rule as PolicyRuleEntity
            if (entity.data.rateLimit) {
              const { requestsPerMinute, tokensPerMinute, scope } = entity.data.rateLimit;
              const key = scope === POLICY_SCOPE_USER
                ? `${context.auth.userId}:${entity.id}`
                : `${POLICY_SCOPE_GLOBAL}:${entity.id}`;

              const now = Date.now();
              // There is no windowSeconds; the window is per minute (60,000 ms)
              const windowMs = 60000;
              const rateLimits = yield* Ref.get(rateLimitRepo);
              const current = HashMap.get(rateLimits, key);

              if (Option.isNone(current) || (now - current.value.windowStart) > windowMs) {
                // Start new window
                yield* Ref.set(rateLimitRepo, HashMap.set(rateLimits, key, {
                  count: 1,
                  windowStart: now
                }));
              } else if (requestsPerMinute !== undefined && current.value.count >= requestsPerMinute) {
                // Rate limit exceeded
                return {
                  allowed: false,
                  reason: `Rate limit exceeded: ${requestsPerMinute} requests per minute`,
                  effectiveModel: context.requestedModel
                };
              } else {
                // Increment counter
                yield* Ref.set(rateLimitRepo, HashMap.set(rateLimits, key, {
                  count: current.value.count + 1,
                  windowStart: current.value.windowStart
                }));
              }
            }
          }

          if (matchingRules.length === 0) {
            return {
              allowed: true,
              effectiveModel: context.requestedModel
            };
          }

          matchingRules.sort((a, b) => {
            const entityA = a as PolicyRuleEntity
            const entityB = b as PolicyRuleEntity
            return entityA.data.priority - entityB.data.priority
          });
          const highestPriorityRule = matchingRules[0] as PolicyRuleEntity;

          if (highestPriorityRule.data.type === POLICY_RULE_DENY) {
            return {
              allowed: false,
              reason: highestPriorityRule.data.description || "Operation denied by policy",
              effectiveModel: context.requestedModel
            };
          }

          return {
            allowed: true,
            effectiveModel: context.requestedModel
          };
        }),

      /**
 * Records the outcome of a policy-checked operation for auditing and analytics.
 *
 * @param outcome - The operation outcome context
 * @returns Effect yielding void or PolicyError
 */
      recordOutcome: (outcome: PolicyRecordContext): Effect.Effect<void, PolicyError> =>
        Effect.gen(function* () {
          const usageData: PolicyUsageData = {
            userId: outcome.auth.userId,
            modelUsed: outcome.modelUsed,
            operationType: outcome.operationType,
            status: outcome.status,
            timestamp: Date.now(),
            latencyMs: outcome.latencyMs
          };

          const usageEntity: PolicyUsageEntity = {
            id: uuidv4(),
            data: usageData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          yield* Effect.try({
            try: () => Effect.gen(function* () {
              const repo = yield* Ref.get(usageRepo);
              yield* Ref.set(usageRepo, HashMap.set(repo, usageEntity.id, usageEntity));
            }),
            catch: error => new PolicyError({
              method: "recordOutcome",
              description: `Failed to record policy outcome: ${error instanceof Error ? error.message : String(error)}`,
              cause: error instanceof Error ? error : undefined
            })
          });
        }),

      /**
 * Creates a new policy rule.
 *
 * @param rule - Rule data (without id)
 * @returns Effect yielding the created PolicyRuleEntity or PolicyError
 */
      createRule: (rule: Omit<PolicyRuleData, "id">): Effect.Effect<PolicyRuleEntity, PolicyError> =>
        Effect.gen(function* () {
          const ruleData: PolicyRuleData = {
            ...rule,
            id: uuidv4()
          };

          const ruleEntity: PolicyRuleEntity = {
            id: ruleData.id,
            data: ruleData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          yield* Effect.try({
            try: () => Effect.gen(function* () {
              const repo = yield* Ref.get(ruleRepo);
              yield* Ref.set(ruleRepo, HashMap.set(repo, ruleEntity.id, ruleEntity));
            }),
            catch: error => new PolicyError({
              method: "createRule",
              description: `Failed to create policy rule: ${error instanceof Error ? error.message : String(error)}`,
              cause: error instanceof Error ? error : undefined
            })
          });

          return ruleEntity;
        }),

      /**
 * Retrieves a policy rule by its id.
 *
 * @param ruleId - The rule id
 * @returns Effect yielding Option<PolicyRuleEntity> or PolicyError
 */
      getRule: (ruleId: string): Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);
          return HashMap.get(rules, ruleId);
        }),

      /**
 * Updates an existing policy rule.
 *
 * @param ruleId - The rule id
 * @param updates - Partial rule data (no id)
 * @returns Effect yielding updated PolicyRuleEntity or PolicyError
 */
      updateRule: (ruleId: string, updates: Partial<Omit<PolicyRuleData, "id">>): Effect.Effect<PolicyRuleEntity, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);
          const existingRule = HashMap.get(rules, ruleId);

          if (Option.isNone(existingRule)) {
            return yield* Effect.fail(new PolicyError({
              method: "updateRule",
              description: `Policy rule not found: ${ruleId}`
            }));
          }

          const updatedData = {
            ...((existingRule.value as PolicyRuleEntity).data),
            ...updates
          };

          const updatedRule: PolicyRuleEntity = {
            ...(existingRule.value as PolicyRuleEntity),
            data: updatedData,
            updatedAt: new Date().toISOString()
          };

          yield* Effect.try({
            try: () => Effect.gen(function* () {
              yield* Ref.set(ruleRepo, HashMap.set(rules, ruleId, updatedRule));
            }),
            catch: error => new PolicyError({
              method: "updateRule",
              description: `Failed to update policy rule: ${error instanceof Error ? error.message : String(error)}`,
              cause: error instanceof Error ? error : undefined
            })
          });

          return updatedRule;
        }),

      /**
 * Deletes a policy rule by id.
 *
 * @param ruleId - The rule id
 * @returns Effect yielding Option<PolicyRuleEntity> (Some if deleted, None if not found) or PolicyError
 */
      deleteRule: (ruleId: string): Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);
          const maybeRule = HashMap.get(rules, ruleId);
          if (Option.isSome(maybeRule)) {
            yield* Effect.try({
              try: () => Effect.gen(function* () {
                yield* Ref.set(ruleRepo, HashMap.remove(rules, ruleId));
              }),
              catch: error => new PolicyError({
                method: "deleteRule",
                description: `Failed to delete policy rule: ${error instanceof Error ? error.message : String(error)}`,
                cause: error instanceof Error ? error : undefined
              })
            });
            return maybeRule;
          }
          return Option.none();
        }),
    /**
     * Resets all in-memory state (rules, usage, rate limits). For test harness use only.
     *
     * @remarks
     * This method is not part of the public API. Use only in tests.
     */
    resetAll: (): Effect.Effect<void, never> =>
        Effect.gen(function* () {
          yield* Ref.set(ruleRepo, HashMap.empty());
          yield* Ref.set(usageRepo, HashMap.empty());
          yield* Ref.set(rateLimitRepo, HashMap.empty());
        })
    };
  })
}) { }