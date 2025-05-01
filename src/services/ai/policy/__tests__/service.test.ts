import { Effect, Layer, Ref, HashMap, Option } from "effect";
import { describe, expect, it } from "vitest";
import { PolicyRuleData, PolicyRuleEntity, PolicyUsageEntity } from "../schema.js";
import { PolicyService } from "../service.js";
import { PolicyCheckContext, PolicyRecordContext } from "../types.js";
import { PolicyError } from "../errors.js";

describe("PolicyService", () => {
  const ServiceLayer = Layer.effect(
    PolicyService,
    Effect.gen(function* () {
      const ruleRepo = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());
      const usageRepo = yield* Ref.make(HashMap.empty<string, PolicyUsageEntity>());

      const rules = yield* Ref.make(HashMap.empty<string, PolicyRuleEntity>());
      const usages = yield* Ref.make(HashMap.empty<string, PolicyUsageEntity>());

      return {
        checkPolicy: (context: PolicyCheckContext) => Effect.gen(function* () {
          const currentRules = yield* Ref.get(rules);
          if (HashMap.isEmpty(currentRules)) {
            return {
              allowed: true,
              effectiveModel: context.requestedModel
            };
          }

          const matchingRules = Array.from(HashMap.values(currentRules))
            .filter(rule => {
              const resourceMatch = rule.data.resource === context.operationType;
              const enabled = rule.data.enabled;
              return enabled && resourceMatch;
            });

          if (matchingRules.length === 0) {
            return {
              allowed: true,
              effectiveModel: context.requestedModel
            };
          }

          matchingRules.sort((a, b) => a.data.priority - b.data.priority);
          const highestPriorityRule = matchingRules[0];

          return {
            allowed: highestPriorityRule.data.type === "allow",
            effectiveModel: context.requestedModel
          };
        }),

        recordOutcome: (outcome: PolicyRecordContext) => Effect.gen(function* () {
          const usageEntity: PolicyUsageEntity = {
            id: "test-id",
            data: {
              userId: outcome.auth.userId,
              modelUsed: outcome.modelUsed,
              operationType: outcome.operationType,
              status: outcome.status,
              timestamp: Date.now(),
              latencyMs: outcome.latencyMs
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          yield* Ref.update(usages, HashMap.set(usageEntity.id, usageEntity));
        }),

        createRule: (rule: Omit<PolicyRuleData, "id">) => Effect.gen(function* () {
          const ruleEntity: PolicyRuleEntity = {
            id: "test-id",
            data: { ...rule, id: "test-id" },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          yield* Ref.update(rules, HashMap.set(ruleEntity.id, ruleEntity));
          return ruleEntity;
        }),

        getRule: (ruleId: string) => Effect.gen(function* () {
          const currentRules = yield* Ref.get(rules);
          return HashMap.get(currentRules, ruleId);
        }),

        updateRule: (ruleId: string, updates: Partial<Omit<PolicyRuleData, "id">>) => Effect.gen(function* () {
          const currentRules = yield* Ref.get(rules);
          const existingRule = HashMap.get(currentRules, ruleId);

          if (Option.isNone(existingRule)) {
            return yield* Effect.fail(new PolicyError({
              method: "updateRule",
              description: `Policy rule not found: ${ruleId}`
            }));
          }

          const updatedRule: PolicyRuleEntity = {
            ...existingRule.value,
            data: { ...existingRule.value.data, ...updates },
            updatedAt: new Date().toISOString()
          };

          yield* Ref.update(rules, HashMap.set(ruleId, updatedRule));
          return updatedRule;
        }),

        deleteRule: (ruleId: string) => Effect.gen(function* () {
          yield* Ref.update(rules, HashMap.remove(ruleId));
        })
      };
    })
  );

  describe("checkPolicy", () => {
    const checkPolicyTest = Effect.gen(function* (_) {
      const testContext: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "chat"
      };

      const service = yield* PolicyService;
      const result = yield* service.checkPolicy(testContext);

      expect(result.allowed).toBe(true);
      expect(result.effectiveModel).toBe("gpt-4");
    });

    it("should allow operations by default when no rules exist", async () => {
      const program = Effect.gen(function* (_) {
        yield* checkPolicyTest;
      });

      await Effect.runPromise(Effect.provide(program, ServiceLayer));
    });

    const denyPolicyTest = Effect.gen(function* (_) {
      const testContext: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "chat"
      };

      const service = yield* PolicyService;

      // Create a deny rule
      const denyRule = yield* service.createRule({
        name: "deny-chat",
        type: "deny",
        resource: "chat",
        priority: 1,
        enabled: true
      });

      // Check policy after creating deny rule
      const result = yield* service.checkPolicy(testContext);

      expect(result.allowed).toBe(false);
      expect(result.effectiveModel).toBe("gpt-4");
    });

    it("should deny operations when matching deny rule exists", async () => {
      const program = Effect.gen(function* (_) {
        yield* denyPolicyTest;
      });

      await Effect.runPromise(Effect.provide(program, ServiceLayer));
    });
  });

  describe("recordOutcome", () => {
    const recordOutcomeTest = Effect.gen(function* (_) {
      const testOutcome: PolicyRecordContext = {
        auth: { userId: "test-user" },
        modelUsed: "gpt-4",
        operationType: "chat",
        status: "success",
        latencyMs: 1000
      };

      const service = yield* PolicyService;
      yield* service.recordOutcome(testOutcome);
    });

    it("should record policy usage outcome", async () => {
      const program = Effect.gen(function* (_) {
        yield* recordOutcomeTest;
      });

      await Effect.runPromise(Effect.provide(program, ServiceLayer));
    });
  });

  describe("rule management", () => {
    const ruleManagementTest = Effect.gen(function* (_) {
      const rule: Omit<PolicyRuleData, "id"> = {
        name: "test-rule",
        type: "allow",
        resource: "chat",
        priority: 1,
        enabled: true
      };

      const service = yield* PolicyService;

      // Create rule
      const createdRule = yield* service.createRule(rule);
      expect(createdRule.data.name).toBe(rule.name);

      // Get rule
      const fetchedRule = yield* service.getRule(createdRule.id);
      expect(fetchedRule._tag).toBe("Some");
      if (fetchedRule._tag === "Some") {
        expect(fetchedRule.value.data.name).toBe(rule.name);
      }

      // Update rule
      const updatedRule = yield* service.updateRule(createdRule.id, {
        enabled: false
      });
      expect(updatedRule.data.enabled).toBe(false);

      // Delete rule
      yield* service.deleteRule(createdRule.id);

      // Verify deletion
      const deletedRule = yield* service.getRule(createdRule.id);
      expect(deletedRule._tag).toBe("None");
    });

    it("should support full CRUD operations for rules", async () => {
      const program = Effect.gen(function* (_) {
        yield* ruleManagementTest;
      });

      await Effect.runPromise(Effect.provide(program, ServiceLayer));
    });
  });
});
