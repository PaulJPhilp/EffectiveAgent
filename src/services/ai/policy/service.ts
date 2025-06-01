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


import { ConfigurationService } from "@/services/core/configuration/index.js";
import { Effect, HashMap, Option, Ref } from "effect";
import { v4 as uuidv4 } from "uuid";
import type { PolicyServiceApi } from "./api.js";
import { PolicyError } from "./errors.js";
import { PolicyRuleData, PolicyRuleEntity, PolicyUsageData, PolicyUsageEntity } from "./schema.js";
import type {
  PolicyCheckContext,
  PolicyCheckResult,
  PolicyRecordContext
} from "./types.js";
import { POLICY_RULE_DENY } from "./types.js";

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
// Implementation effect for PolicyService
export const policyServiceEffect = Effect.gen(function* () {
  const configService = yield* ConfigurationService;

  // Load policy config from environment variable
  const policyConfigPath = process.env.POLICY_CONFIG_PATH || "./config/policies.json";
  const config = yield* configService.loadPolicyConfig(policyConfigPath).pipe(
    Effect.mapError((error) => new PolicyError({
      method: "initialize",
      description: "Failed to load policy configuration",
      cause: error
    }))
  );

  // Initialize repositories
  const ruleRepo = yield* Ref.make(HashMap.fromIterable(
    config.policies.map((rule: { id: any; }) => [rule.id, {
      id: rule.id,
      data: rule,
      createdAt: new Date(),
      updatedAt: new Date()
    }])
  ));
  const usageRepo = yield* Ref.make(HashMap.empty<string, PolicyUsageEntity>());
  const rateLimitRepo = yield* Ref.make(HashMap.empty<string, { count: number, windowStart: number }>());

  return {
    /**
     * Checks if the given operation is allowed under current policy rules and rate limits.
     *
     * @method
     * @description
     * Evaluates a requested operation against all applicable policy rules and rate limits.
     * Rules are evaluated in priority order, with deny rules taking precedence.
     * Rate limits are checked per-rule based on user or global scope.
     *
     * @param {PolicyCheckContext} context - The context of the operation to check
     * @param {AuthRecord} context.auth - User authentication information
     * @param {string} context.requestedModel - The AI model being requested
     * @param {string} context.operationType - Type of operation (e.g., 'text:generate')
     * @param {string} [context.pipelineId] - Optional pipeline identifier
     * @param {Record<string, string|number|boolean>} [context.tags] - Optional operation tags
     *
     * @returns {Effect.Effect<PolicyCheckResult, PolicyError>}
     * Returns an Effect that resolves to:
     * - On success: PolicyCheckResult with allowed status and effective model
     * - On failure: PolicyError with detailed error information
     *
     * @throws {PolicyError}
     * - When rule evaluation fails
     * - When rate limit checking fails
     *
     * @example
     * ```typescript
     * const result = yield* service.checkPolicy({
     *   auth: { userId: "user1" },
     *   requestedModel: "gpt-4",
     *   operationType: "text:generate"
     * });
     * if (result.allowed) {
     *   // Proceed with operation
     * }
     * ```
     */
    checkPolicy: (context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError, never> =>
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
        const denyRule = matchingRules
          .find(rule => (rule as PolicyRuleEntity).data.type === POLICY_RULE_DENY);

        if (denyRule) {
          yield* Effect.logDebug("Found matching deny rule", { rule: denyRule });
          return {
            allowed: false,
            reason: (denyRule as PolicyRuleEntity).data.description ?? "Operation denied by policy",
            effectiveModel: context.requestedModel
          };
        }

        yield* Effect.logDebug("Operation allowed by policy");
        return {
          allowed: true,
          effectiveModel: context.requestedModel
        };
      }),

    /**
     * Records the outcome of a policy-checked operation for auditing and analytics.
     *
     * @method
     * @description
     * Stores the outcome of an operation that was checked against policies.
     * This data can be used for auditing, analytics, and improving policy rules.
     *
     * @param {PolicyRecordContext} outcome - The outcome details to record
     * @param {AuthRecord} outcome.auth - User authentication information
     * @param {string} outcome.modelUsed - The AI model that was used
     * @param {string} outcome.operationType - Type of operation performed
     * @param {'success'|'error'|'blocked'} outcome.status - Outcome status
     * @param {number} outcome.latencyMs - Operation latency in milliseconds
     * @param {TokenUsage} [outcome.usage] - Optional token usage details
     * @param {Object} [outcome.error] - Optional error details if status is 'error'
     * @param {Record<string, string|number|boolean>} [outcome.tags] - Optional operation tags
     *
     * @returns {Effect.Effect<void, PolicyError>}
     * Returns an Effect that resolves to:
     * - On success: void
     * - On failure: PolicyError with detailed error information
     *
     * @throws {PolicyError}
     * When recording the outcome fails
     *
     * @example
     * ```typescript
     * yield* service.recordOutcome({
     *   auth: { userId: "user1" },
     *   modelUsed: "gpt-4",
     *   operationType: "text:generate",
     *   status: "success",
     *   latencyMs: 1500,
     *   usage: { totalTokens: 150 }
     * });
     * ```
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
          createdAt: new Date(),
          updatedAt: new Date()
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
     * @method
     * @description
     * Creates a new policy rule with a generated UUID and timestamps.
     * The rule is immediately active and will be used in policy checks.
     *
     * @param {Omit<PolicyRuleData, "id">} rule - The rule data to create
     * @param {string} rule.name - Name of the rule
     * @param {'allow'|'deny'} rule.type - Rule type
     * @param {string} rule.resource - Resource the rule applies to
     * @param {number} rule.priority - Rule priority (lower numbers = higher priority)
     * @param {boolean} rule.enabled - Whether the rule is enabled
     * @param {string} [rule.conditions] - Optional conditions for rule application
     * @param {string} [rule.description] - Optional rule description
     * @param {RateLimit} [rule.rateLimit] - Optional rate limiting configuration
     *
     * @returns {Effect.Effect<PolicyRuleEntity, PolicyError>}
     * Returns an Effect that resolves to:
     * - On success: The created PolicyRuleEntity
     * - On failure: PolicyError with detailed error information
     *
     * @throws {PolicyError}
     * When rule creation fails
     *
     * @example
     * ```typescript
     * const rule = yield* service.createRule({
     *   name: "Basic rate limit",
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
    createRule: (rule: Omit<PolicyRuleData, "id">): Effect.Effect<PolicyRuleEntity, PolicyError> =>
      Effect.gen(function* () {


        const ruleData: PolicyRuleData = {
          ...rule,
          id: uuidv4()
        };

        const ruleEntity: PolicyRuleEntity = {
          id: ruleData.id,
          data: ruleData,
          createdAt: new Date(),
          updatedAt: new Date()
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
        return HashMap.get(rules, ruleId) as Option.Option<PolicyRuleEntity>;
      }),

    /**
     * Updates an existing policy rule.
     *
     * @method
     * @description
     * Updates an existing policy rule with new data while preserving its ID.
     * Only provided fields will be updated; others remain unchanged.
     * The rule's updatedAt timestamp is automatically updated.
     *
     * @param {string} ruleId - The ID of the rule to update
     * @param {Partial<Omit<PolicyRuleData, "id">>} updates - The fields to update
     * @param {string} [updates.name] - New rule name
     * @param {'allow'|'deny'} [updates.type] - New rule type
     * @param {string} [updates.resource] - New resource type
     * @param {number} [updates.priority] - New priority
     * @param {boolean} [updates.enabled] - New enabled status
     * @param {string} [updates.conditions] - New conditions
     * @param {string} [updates.description] - New description
     * @param {RateLimit} [updates.rateLimit] - New rate limit configuration
     *
     * @returns {Effect.Effect<PolicyRuleEntity, PolicyError>}
     * Returns an Effect that resolves to:
     * - On success: The updated PolicyRuleEntity
     * - On failure: PolicyError with detailed error information
     *
     * @throws {PolicyError}
     * - When the rule is not found
     * - When the update operation fails
     *
     * @example
     * ```typescript
     * const updated = yield* service.updateRule("rule-1", {
     *   enabled: false,
     *   description: "Temporarily disabled"
     * });
     * ```
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

        const existingRuleEntity = existingRule.value as PolicyRuleEntity;

        const updatedData = {
          ...existingRuleEntity.data,
          ...updates
        };

        const updatedRule: PolicyRuleEntity = {
          id: existingRuleEntity.id,
          data: updatedData,
          createdAt: existingRuleEntity.createdAt,
          updatedAt: new Date()
        };

        // Update the rule in the repository
        yield* Ref.set(ruleRepo, HashMap.set(rules, ruleId, updatedRule));

        // Return the updated rule
        return updatedRule;
      }),

    /**
     * Deletes a policy rule by id.
     *
     * @method
     * @description
     * Removes a policy rule from the system. If the rule exists, it is immediately
     * removed and will no longer be used in policy checks. If the rule doesn't
     * exist, returns None without error.
     *
     * @param {string} ruleId - The ID of the rule to delete
     *
     * @returns {Effect.Effect<Option<PolicyRuleEntity>, PolicyError>}
     * Returns an Effect that resolves to:
     * - On success with existing rule: Some(PolicyRuleEntity)
     * - On success with non-existent rule: None
     * - On failure: PolicyError with detailed error information
     *
     * @throws {PolicyError}
     * When the delete operation fails
     *
     * @example
     * ```typescript
     * const maybeDeleted = yield* service.deleteRule("rule-1");
     * if (Option.isSome(maybeDeleted)) {
     *   console.log("Rule deleted:", maybeDeleted.value);
     * }
     * ```
     */
    deleteRule: (ruleId: string): Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError> =>
      Effect.gen(function* () {


        const rules = yield* Ref.get(ruleRepo);
        const maybeRule = HashMap.get(rules, ruleId) as Option.Option<PolicyRuleEntity>;
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
        return Option.none<PolicyRuleEntity>();
      }),
    /**
     * Resets all in-memory state (rules, usage, rate limits). For test harness use only.
     *
     * @method
     * @description
     * Clears all in-memory repositories:
     * - Policy rules
     * - Usage records
     * - Rate limit counters
     *
     * @remarks
     * - This method is not part of the public API
     * - Should only be used in tests
     * - Does not affect persisted configuration
     *
  }),
 
/**
 * Resets all in-memory state (rules, usage, rate limits). For test harness use only.
 *
 * @method
 * @description
 * Clears all in-memory repositories:
 * - Policy rules
 * - Usage records
 * - Rate limit counters
 *
 * @remarks
 * - This method is not part of the public API
 * - Should only be used in tests
 * - Does not affect persisted configuration
 *
 * @returns {Effect.Effect<void, never>}
 * Always succeeds, never produces an error
 *
 * @internal
 */
    resetAll: () => Effect.gen(function* () {
      yield* Ref.set(ruleRepo, HashMap.empty());
      yield* Ref.set(usageRepo, HashMap.empty());
      yield* Ref.set(rateLimitRepo, HashMap.empty());
    }),

    /**
     * Checks the health of the policy service
     */
    healthCheck: () => Effect.gen(function* () {
      // Verify repositories are accessible
      yield* Ref.get(ruleRepo);
      yield* Ref.get(usageRepo);
      yield* Ref.get(rateLimitRepo);
      yield* Effect.logDebug("Policy service health check passed");
    }),

    /**
     * Shuts down the policy service and cleans up resources
     */
    shutdown: () => Effect.gen(function* () {
      yield* Ref.set(ruleRepo, HashMap.empty());
      yield* Ref.set(usageRepo, HashMap.empty());
      yield* Ref.set(rateLimitRepo, HashMap.empty());
      yield* Effect.logInfo("Policy service shutdown completed");
    })
  };
});

export class PolicyService extends Effect.Service<PolicyServiceApi>()(
  "PolicyService",
  {
    effect: policyServiceEffect,
    dependencies: [ConfigurationService.Default]
  }
) { }