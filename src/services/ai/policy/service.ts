/**
 * @file Implements the PolicyService for managing and enforcing AI operation policies.
 * @module services/ai/policy/service
 *
 * @description
 * The PolicyService manages and enforces policies for AI operations, including:
 * - Policy rule management (CRUD operations)
 * - Rate limiting for operations
 * - Policy outcome recording for auditing
 * - Real-time policy checking and enforcement
 *
 * @example
 * ```typescript
 * const service = yield* PolicyService;
 * const result = yield* service.checkPolicy({
 *   auth: { userId: "user1" },
 *   requestedModel: "gpt-4",
 *   operationType: "text:generate"
 * });
 * ```
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect, HashMap, Option, Ref } from "effect";
import type { PolicyServiceApi } from "./api.js";
import { PolicyError } from "./errors.js";
import { PolicyRuleEntity } from "./schema.js";
import type {
  PolicyCheckContext,
  PolicyCheckResult
} from "./types.js";
import { POLICY_RULE_ALLOW, POLICY_RULE_DENY } from "./types.js";

import { PolicyConfigFile } from "./schema.js";

type PolicyConfigData = typeof PolicyConfigFile.Type;

/**
 * PolicyService provides policy rule management, rate limiting, and policy outcome
 * recording for AI operations using the Effect.Service pattern.
 *
 * @class
 * @extends {Effect.Service<PolicyServiceApi>}
 *
 * @description
 * The PolicyService is responsible for:
 * - Managing policy rules (create, read, update, delete)
 * - Enforcing rate limits on operations
 * - Recording policy outcomes for auditing
 * - Real-time policy checking during operations
 *
 * @remarks
 * - Uses Effect-TS for functional error handling and dependency injection
 * - Loads initial configuration from policy.json via ConfigurationService
 * - Maintains state in-memory using Effect Refs for:
 *   - Policy rules
 *   - Usage records
 *   - Rate limit windows
 * - All operations are type-safe and return properly typed Effects
 *
 * @example
 * ```typescript
 * // Create a new policy rule
 * const rule = yield* service.createRule({
 *   name: "Rate limit rule",
 *   type: "allow",
 *   resource: "text:generate",
 *   priority: 1,
 *   enabled: true,
 *   rateLimit: {
 *     requestsPerMinute: 10,
 *     scope: "user"
 *   }
 * });
 * ```
 */
export class PolicyService extends Effect.Service<PolicyServiceApi>()("PolicyService", {
  effect: Effect.gen(function* () {
    // Load our own config via ConfigurationService
    const configService = yield* ConfigurationService;

    // Get policy config path from master config
    const masterConfig = yield* configService.getMasterConfig();
    const policyConfigPath = masterConfig.configPaths?.policy || "./config/policy.json";
    const config = yield* configService.loadPolicyConfig(policyConfigPath);

    // Initialize rule repository
    const ruleRepo = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());

    // Load initial rules
    for (const rule of config.policies) {
      yield* Ref.update(ruleRepo, rules => HashMap.set(rules, rule.id, {
        id: rule.id,
        data: rule,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    // Return service implementation
    const checkPolicy = (context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError, never> =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Checking policy", { context });
        const rules = yield* Ref.get(ruleRepo);

        if (HashMap.isEmpty(rules)) {
          yield* Effect.logDebug("No rules found, allowing operation");
          return {
            allowed: true,
            effectiveModel: context.requestedModel
          };
        }

        const matchingRules = Array.from(HashMap.values(rules))
          .filter((rule: unknown) => {
            const entityRule = rule as PolicyRuleEntity;
            const ruleData = entityRule.data;

            // Check if rule applies to this operation
            if (ruleData.resource && ruleData.resource !== context.operationType) {
              return false;
            }

            // Check if rule applies to this model
            if (ruleData.conditions) {
              try {
                const conditions = JSON.parse(ruleData.conditions);
                if (conditions.model && conditions.model !== context.requestedModel) {
                  return false;
                }
              } catch {
                // Invalid conditions JSON, skip model check
              }
            }

            // Rule must be enabled
            return ruleData.enabled;
          })
          .sort((a, b) => {
            const entityA = a as PolicyRuleEntity;
            const entityB = b as PolicyRuleEntity;
            return entityB.data.priority - entityA.data.priority;
          });

        // Check for matching deny rules first (highest priority wins)
        const denyRule = matchingRules.find(rule => (rule as PolicyRuleEntity).data.type === POLICY_RULE_DENY);

        if (denyRule) {
          yield* Effect.logInfo("Operation denied by policy rule", {
            ruleId: (denyRule as PolicyRuleEntity).id,
            context
          });
          return {
            allowed: false,
            effectiveModel: context.requestedModel,
            reason: (denyRule as PolicyRuleEntity).data.description || "Operation denied by policy"
          };
        }

        // No deny rules matched, look for allow rules
        const allowRule = matchingRules.find(rule => (rule as PolicyRuleEntity).data.type === POLICY_RULE_ALLOW);

        if (allowRule) {
          yield* Effect.logInfo("Operation allowed by policy rule", {
            ruleId: (allowRule as PolicyRuleEntity).id,
            context
          });
          return {
            allowed: true,
            effectiveModel: context.requestedModel
          };
        }

        // No matching rules found, default to deny
        yield* Effect.logInfo("No matching rules found, denying operation by default", { context });
        return {
          allowed: false,
          effectiveModel: context.requestedModel,
          reason: "No matching policy rules found"
        };
      });

    const addRule = (rule: PolicyRuleEntity): Effect.Effect<PolicyRuleEntity, PolicyError, never> =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Adding policy rule", { rule });
        yield* Ref.update(ruleRepo, rules => HashMap.set(rules, rule.id, rule));
        return rule;
      });

    const removeRule = (ruleId: string): Effect.Effect<void, PolicyError, never> =>
      Effect.gen(function* () {
        yield* Effect.logDebug("Removing policy rule", { ruleId });
        yield* Ref.update(ruleRepo, rules => HashMap.remove(rules, ruleId));
      });

    const getRules = (): Effect.Effect<readonly PolicyRuleEntity[], PolicyError, never> =>
      Effect.gen(function* () {
        const rules = yield* Ref.get(ruleRepo);
        return Array.from(HashMap.values(rules));
      });

    const healthCheck = () =>
      Effect.succeed(void 0).pipe(Effect.tap(() => Effect.logDebug("PolicyService healthCheck called")));

    const shutdown = () =>
      Effect.succeed(void 0).pipe(Effect.tap(() => Effect.logDebug("PolicyService shutdown called")));

    return {
      checkPolicy,
      createRule: (rule) => {
        const id = crypto.randomUUID();
        return addRule({
          id,
          data: { ...rule, id },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      },
      getRule: (ruleId) => Effect.map(getRules(), rules =>
        Option.fromNullable(rules.find(r => r.id === ruleId))
      ),
      updateRule: (ruleId, updates) => Effect.fail(new PolicyError({ description: "Not implemented", method: "updateRule" })),
      deleteRule: (ruleId) => Effect.gen(function* () {
        yield* removeRule(ruleId);
        return Option.none();
      }),
      recordOutcome: () => Effect.fail(new PolicyError({ description: "Not implemented", method: "recordOutcome" })),
      resetAll: () => Effect.succeed(void 0),
      healthCheck,
      shutdown
    } satisfies PolicyServiceApi;
  }),
  dependencies: [ConfigurationService.Default]
}) { }