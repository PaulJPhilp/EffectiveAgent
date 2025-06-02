import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Option } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PolicyError } from "../errors.js";
import { PolicyService } from "../service.js";
import { PolicyCheckContext, PolicyRecordContext } from "../types.js";

describe("PolicyService", () => {
  const testDir = join(process.cwd(), "test-policy-configs");
  const validPolicyConfig = join(testDir, "valid-policy.json");
  const emptyPolicyConfig = join(testDir, "empty-policy.json");

  const validPolicyConfigData = {
    name: "Test Policy Config",
    version: "1.0.0",
    rules: [
      {
        id: "rate-limit-rule",
        name: "Rate Limit Rule",
        description: "Limit API calls per minute",
        enabled: true,
        action: "allow",
        conditions: {
          "rate.requests_per_minute": { "<=": 100 }
        },
        priority: 100
      },
      {
        id: "cost-limit-rule",
        name: "Cost Limit Rule",
        description: "Limit cost per operation",
        enabled: true,
        action: "deny",
        conditions: {
          "cost.total": { ">": 10.0 }
        },
        priority: 200
      }
    ]
  };

  const emptyPolicyConfigData = {
    name: "Empty Policy Config",
    version: "1.0.0",
    rules: []
  };

  // Store original env vars
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(validPolicyConfig, JSON.stringify(validPolicyConfigData, null, 2));
    writeFileSync(emptyPolicyConfig, JSON.stringify(emptyPolicyConfigData, null, 2));

    // Set up environment with test config path
    process.env.POLICY_CONFIG_PATH = validPolicyConfig;
  });

  afterEach(() => {
    // Clean up test files
    try {
      unlinkSync(validPolicyConfig);
      unlinkSync(emptyPolicyConfig);
      rmdirSync(testDir);
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset environment
    process.env = { ...originalEnv };
  });

  describe("service instantiation", () => {
    it("should instantiate the service", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        expect(service).toBeDefined();
        expect(typeof service.checkPolicy).toBe("function");
        expect(typeof service.createRule).toBe("function");
        expect(typeof service.healthCheck).toBe("function");
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("healthCheck", () => {
    it("should perform health check successfully", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.healthCheck(); // Should not throw
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("checkPolicy", () => {
    it("should allow operation within rate limits", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const context: PolicyCheckContext = {
          operationType: "chat",
          modelId: "gpt-4o",
          providerId: "openai",
          userId: "test-user",
          metadata: {
            rate: { requests_per_minute: 50 },
            cost: { total: 0.01 }
          }
        };

        const result = yield* service.checkPolicy(context);
        expect(result.allowed).toBe(true);
        expect(result.matchedRules).toBeDefined();
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should deny operation exceeding cost limits", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const context: PolicyCheckContext = {
          operationType: "chat",
          modelId: "gpt-4o",
          providerId: "openai",
          userId: "test-user",
          metadata: {
            rate: { requests_per_minute: 10 },
            cost: { total: 15.0 } // Exceeds the 10.0 limit
          }
        };

        const result = yield* service.checkPolicy(context);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("cost");
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should deny operation exceeding rate limits", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const context: PolicyCheckContext = {
          operationType: "chat",
          modelId: "gpt-4o",
          providerId: "openai",
          userId: "test-user",
          metadata: {
            rate: { requests_per_minute: 150 }, // Exceeds the 100 limit
            cost: { total: 1.0 }
          }
        };

        const result = yield* service.checkPolicy(context);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("rate");
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("recordOutcome", () => {
    it("should record successful operation outcome", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const outcome: PolicyRecordContext = {
          checkResult: {
            allowed: true,
            matchedRules: ["rate-limit-rule"],
            reason: "Operation allowed"
          },
          operationResult: {
            success: true,
            duration: 1500,
            tokensUsed: 250,
            cost: 0.05
          },
          context: {
            operationType: "chat",
            modelId: "gpt-4o",
            providerId: "openai",
            userId: "test-user",
            metadata: {}
          }
        };

        yield* service.recordOutcome(outcome); // Should not throw
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should record failed operation outcome", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const outcome: PolicyRecordContext = {
          checkResult: {
            allowed: false,
            matchedRules: ["cost-limit-rule"],
            reason: "Cost limit exceeded"
          },
          operationResult: {
            success: false,
            error: "Operation blocked by policy"
          },
          context: {
            operationType: "chat",
            modelId: "gpt-4o",
            providerId: "openai",
            userId: "test-user",
            metadata: {}
          }
        };

        yield* service.recordOutcome(outcome); // Should not throw
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("rule management", () => {
    it("should create a new rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        const newRule = {
          name: "New Test Rule",
          description: "A test rule created during testing",
          enabled: true,
          action: "allow" as const,
          conditions: {
            "user.type": { "==": "premium" }
          },
          priority: 50
        };

        const created = yield* service.createRule(newRule);
        expect(created.data.name).toBe(newRule.name);
        expect(created.data.description).toBe(newRule.description);
        expect(created.data.enabled).toBe(true);
        expect(created.id).toBeDefined();
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should get an existing rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        // First create a rule
        const newRule = {
          name: "Get Test Rule",
          description: "A rule to test retrieval",
          enabled: true,
          action: "deny" as const,
          conditions: {
            "operation.type": { "==": "dangerous" }
          },
          priority: 300
        };

        const created = yield* service.createRule(newRule);

        // Then get it
        const retrieved = yield* service.getRule(created.id);
        expect(Option.isSome(retrieved)).toBe(true);

        if (Option.isSome(retrieved)) {
          expect(retrieved.value.data.name).toBe(newRule.name);
          expect(retrieved.value.id).toBe(created.id);
        }
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should return None for non-existent rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        const retrieved = yield* service.getRule("non-existent-rule-id");
        expect(Option.isNone(retrieved)).toBe(true);
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should update an existing rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        // First create a rule
        const newRule = {
          name: "Update Test Rule",
          description: "A rule to test updates",
          enabled: true,
          action: "allow" as const,
          conditions: {
            "test.value": { "==": "original" }
          },
          priority: 150
        };

        const created = yield* service.createRule(newRule);

        // Then update it
        const updates = {
          name: "Updated Test Rule",
          enabled: false,
          conditions: {
            "test.value": { "==": "updated" }
          }
        };

        const updated = yield* service.updateRule(created.id, updates);
        expect(updated.data.name).toBe(updates.name);
        expect(updated.data.enabled).toBe(false);
        expect(updated.data.conditions).toEqual(updates.conditions);
        expect(updated.data.description).toBe(newRule.description); // Should remain unchanged
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should delete an existing rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        // First create a rule
        const newRule = {
          name: "Delete Test Rule",
          description: "A rule to test deletion",
          enabled: true,
          action: "deny" as const,
          conditions: {
            "delete.test": { "==": true }
          },
          priority: 400
        };

        const created = yield* service.createRule(newRule);

        // Then delete it
        const deleted = yield* service.deleteRule(created.id);
        expect(Option.isSome(deleted)).toBe(true);

        if (Option.isSome(deleted)) {
          expect(deleted.value.id).toBe(created.id);
        }

        // Verify it's gone
        const retrieved = yield* service.getRule(created.id);
        expect(Option.isNone(retrieved)).toBe(true);
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));

    it("should return None when deleting non-existent rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        const deleted = yield* service.deleteRule("non-existent-rule-id");
        expect(Option.isNone(deleted)).toBe(true);
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("resetAll", () => {
    it("should reset all service state", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;

        // Create some rules first
        const rule1 = {
          name: "Rule 1",
          description: "First rule",
          enabled: true,
          action: "allow" as const,
          conditions: { "test": { "==": 1 } },
          priority: 100
        };

        const rule2 = {
          name: "Rule 2",
          description: "Second rule",
          enabled: true,
          action: "deny" as const,
          conditions: { "test": { "==": 2 } },
          priority: 200
        };

        const created1 = yield* service.createRule(rule1);
        const created2 = yield* service.createRule(rule2);

        // Verify they exist
        const retrieved1 = yield* service.getRule(created1.id);
        const retrieved2 = yield* service.getRule(created2.id);
        expect(Option.isSome(retrieved1)).toBe(true);
        expect(Option.isSome(retrieved2)).toBe(true);

        // Reset all
        yield* service.resetAll();

        // Verify they're gone
        const afterReset1 = yield* service.getRule(created1.id);
        const afterReset2 = yield* service.getRule(created2.id);
        expect(Option.isNone(afterReset1)).toBe(true);
        expect(Option.isNone(afterReset2)).toBe(true);
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("shutdown", () => {
    it("should shutdown successfully", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.shutdown(); // Should not throw
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      ));
  });

  describe("configuration edge cases", () => {
    it("should handle empty policy configuration", () => {
      // Point to config with empty rules
      process.env.POLICY_CONFIG_PATH = emptyPolicyConfig;

      return Effect.gen(function* () {
        const service = yield* PolicyService;

        // Should still work for basic operations
        const context: PolicyCheckContext = {
          operationType: "chat",
          modelId: "gpt-4o",
          providerId: "openai",
          userId: "test-user",
          metadata: {}
        };

        const result = yield* service.checkPolicy(context);
        // With no rules, should default to allow
        expect(result.allowed).toBe(true);
        expect(result.matchedRules).toEqual([]);
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      );
    });

    it("should handle missing configuration file", () => {
      // Point to non-existent config file  
      process.env.POLICY_CONFIG_PATH = join(testDir, "missing.json");

      return Effect.gen(function* () {
        const result = yield* Effect.either(Effect.gen(function* () {
          const service = yield* PolicyService;
          return yield* service.healthCheck();
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(PolicyError);
        }
      }).pipe(
        Effect.provide(PolicyService.Default),
        Effect.provide(ConfigurationService.Default),
        Effect.provide(NodeFileSystem.layer)
      );
    });
  });
});
