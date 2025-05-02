/**
 * @file Implements the PolicyService.
 */

import { Effect, HashMap, Option, Ref } from "effect";
import { v4 as uuidv4 } from "uuid";
import { RepositoryError } from "@core/repository/errors.js";
import RepositoryService from "@core/repository/service.js";
import {
  PolicyCheckContext,
  PolicyCheckResult,
  PolicyRecordContext
} from "./types.js";
import {
  PolicyError,
  PolicyCheckError,
  PolicyRecordError
} from "./errors.js";
import {
  PolicyRuleEntity,
  PolicyRuleData,
  PolicyUsageEntity,
  PolicyUsageData
} from "./schema.js";

import { PolicyServiceApi } from "./api.js";
export class PolicyService extends Effect.Service<PolicyServiceApi>()(
  "PolicyService", {
  effect: Effect.gen(function* () {
    const ruleRepo = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());
    const usageRepo = yield* Ref.make(HashMap.empty<string, PolicyUsageEntity>());
    const rateLimitRepo = yield* Ref.make(HashMap.empty<string, { count: number, windowStart: number }>());

    return {
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
              const resourceMatch = rule.data.resource === context.operationType;
              const enabled = rule.data.enabled;
              return enabled && resourceMatch;
            });

          // Check rate limits
          for (const rule of matchingRules) {
            if (rule.data.rateLimit) {
              const { maxRequests, windowSeconds, scope } = rule.data.rateLimit;
              const key = scope === 'user' 
                ? `${context.auth.userId}:${rule.id}`
                : `global:${rule.id}`;

              const now = Date.now();
              const windowMs = windowSeconds * 1000;
              const rateLimits = yield* Ref.get(rateLimitRepo);
              const current = HashMap.get(rateLimits, key);

              if (Option.isNone(current) || (now - current.value.windowStart) > windowMs) {
                // Start new window
                yield* Ref.set(rateLimitRepo, HashMap.set(rateLimits, key, {
                  count: 1,
                  windowStart: now
                }));
              } else if (current.value.count >= maxRequests) {
                // Rate limit exceeded
                return {
                  allowed: false,
                  reason: `Rate limit exceeded: ${maxRequests} requests per ${windowSeconds} seconds`,
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

          matchingRules.sort((a, b) => a.data.priority - b.data.priority);
          const highestPriorityRule = matchingRules[0];

          if (highestPriorityRule.data.type === "deny") {
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

      getRule: (ruleId: string): Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);
          return HashMap.get(rules, ruleId);
        }),

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
            ...existingRule.value.data,
            ...updates
          };

          const updatedRule: PolicyRuleEntity = {
            ...existingRule.value,
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

      deleteRule: (ruleId: string): Effect.Effect<void, PolicyError> =>
        Effect.gen(function* () {
          const rules = yield* Ref.get(ruleRepo);

          if (HashMap.has(rules, ruleId)) {
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
          }
        })
    };
  })
}) { }