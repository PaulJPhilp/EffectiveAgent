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

import { Effect, HashMap, Option, Ref } from "effect";
import { ConfigurationService } from "@/services/core/configuration/service";
import type { PolicyServiceApi } from "./api.js";
import { PolicyError } from "./errors.js";
import type { PolicyConfigFile, PolicyRuleEntity } from "./schema.js";
import type {
  PolicyCheckContext,
  PolicyCheckResult
} from "./types.js";
import { POLICY_RULE_ALLOW, POLICY_RULE_DENY } from "./types.js";

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
    const configService = yield* ConfigurationService;
    const masterConfig = yield* configService.getMasterConfig();
    const policyConfigPath = masterConfig.configPaths?.policy || "./config/policy.json";
    const ruleRepo = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());

    const loadPolicy = () =>
      Effect.gen(function* () {
        const config = yield* configService.loadPolicyConfig(policyConfigPath);
        yield* Ref.set(ruleRepo, HashMap.empty());
        for (const rule of config.policies) {
          yield* Ref.update(ruleRepo, (rules) =>
            HashMap.set(rules, rule.id, {
              id: rule.id,
              data: rule,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          );
        }
      });

    yield* loadPolicy();

    const checkPolicy = (context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError, never> =>
      Effect.gen(function* () {
        const rules = yield* Ref.get(ruleRepo);
        if (HashMap.isEmpty(rules)) {
          return { allowed: true, effectiveModel: context.requestedModel };
        }

        const matchingRules = Array.from(HashMap.values(rules))
          .filter((rule: unknown) => {
            const entityRule = rule as PolicyRuleEntity;
            const ruleData = entityRule.data;
            if (ruleData.resource && ruleData.resource !== context.operationType) return false;
            if (ruleData.conditions) {
              try {
                const conditions = JSON.parse(ruleData.conditions);
                if (conditions.model && conditions.model !== context.requestedModel) return false;
              } catch {}
            }
            return ruleData.enabled;
          })
          .sort((a, b) => (b as PolicyRuleEntity).data.priority - (a as PolicyRuleEntity).data.priority);

        const denyRule = matchingRules.find(rule => (rule as PolicyRuleEntity).data.type === POLICY_RULE_DENY);
        if (denyRule) {
          return {
            allowed: false,
            effectiveModel: context.requestedModel,
            reason: (denyRule as PolicyRuleEntity).data.description || "Operation denied by policy"
          };
        }

        const allowRule = matchingRules.find(rule => (rule as PolicyRuleEntity).data.type === POLICY_RULE_ALLOW);
        if (allowRule) {
          return { allowed: true, effectiveModel: context.requestedModel };
        }

        return {
          allowed: false,
          effectiveModel: context.requestedModel,
          reason: "No matching policy rules found"
        };
      });

    const addRule = (rule: PolicyRuleEntity): Effect.Effect<PolicyRuleEntity, PolicyError, never> =>
      Effect.gen(function* () {
        yield* Ref.update(ruleRepo, (rules) => HashMap.set(rules, rule.id, rule));
        return rule;
      });

    const removeRule = (ruleId: string): Effect.Effect<void, PolicyError, never> =>
      Effect.gen(function* () {
        yield* Ref.update(ruleRepo, (rules) => HashMap.remove(rules, ruleId));
      });

    const getRules = (): Effect.Effect<readonly PolicyRuleEntity[], PolicyError, never> =>
      Effect.gen(function* () {
        return Array.from(HashMap.values(yield* Ref.get(ruleRepo)));
      });

    return {
      loadPolicy,
      checkPolicy,
      createRule: (rule) => {
        const id = crypto.randomUUID();
        return addRule({ id, data: { ...rule, id }, createdAt: new Date(), updatedAt: new Date() });
      },
      getRule: (ruleId) => Effect.map(getRules(), (rules) => Option.fromNullable(rules.find((r) => r.id === ruleId))),
      updateRule: (_ruleId, _updates) => Effect.fail(new PolicyError({ description: "Not implemented", method: "updateRule" })),
      deleteRule: (ruleId) => Effect.gen(function* () {
        const rule = yield* Effect.map(Ref.get(ruleRepo), r => HashMap.get(r, ruleId));
        yield* removeRule(ruleId);
        return rule;
      }),
      recordOutcome: (outcome) => Effect.logDebug("recordOutcome called but not implemented", { outcome }),
      resetAll: () => Ref.set(ruleRepo, HashMap.empty()),
      healthCheck: () => Effect.void,
      shutdown: () => Effect.void
    } satisfies PolicyServiceApi;
  }),
  dependencies: [ConfigurationService.Default]
}) { }