import { join } from "path";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer, Option } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PolicyError } from "../errors.js";
import { PolicyService } from "../service.js";
import { PolicyCheckContext } from "../types.js";

describe("PolicyService", () => {
  it("should have .Default available", () => {
    expect(PolicyService.Default).toBeDefined();
  });

  const testDir = join(process.cwd(), "test-policy-configs", "policy");
  const validPolicyConfig = join(testDir, "valid-policy.json");
  const modelsConfigPath = join(testDir, "models.json");
  const providersConfigPath = join(testDir, "providers.json");
  const masterConfigPath = join(testDir, "master-config.json");

  const validPolicyConfigData = {
    name: "Test Policy Config",
    version: "1.0.0",
    description: "Test policy configuration",
    policies: [
      {
        id: "rate-limit-rule",
        name: "Rate Limit Rule",
        description: "Limit API calls per minute",
        type: "allow",
        resource: "*",
        priority: 100,
        enabled: true,
        rateLimit: {
          limit: 100,
          window: 60
        }
      },
      {
        id: "cost-limit-rule",
        name: "Cost Limit Rule",
        description: "Limit cost per operation",
        type: "deny",
        resource: "*",
        priority: 200,
        enabled: true,
        conditions: {
          "cost.total": { ">": 10.0 }
        }
      }
    ]
  };

  const validMasterConfig = {
    name: "Test Master Config",
    version: "1.0.0",
    runtimeSettings: {
      fileSystemImplementation: "node"
    },
    configPaths: {
      providers: providersConfigPath,
      models: modelsConfigPath,
      policy: validPolicyConfig
    }
  };

  beforeEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(masterConfigPath, JSON.stringify(validMasterConfig, null, 2));
        yield* fs.writeFileString(validPolicyConfig, JSON.stringify(validPolicyConfigData, null, 2));
      }).pipe(Effect.provide(NodeFileSystem.layer))
    );
  });

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        try {
          yield* fs.remove(testDir, { recursive: true });
        } catch (_) {
          // Ignore cleanup errors
        }
      }).pipe(Effect.provide(NodeFileSystem.layer))
    );
  });

  // Centralized dependency layer configuration
  const testLayer = Layer.provide(
    Layer.mergeAll(
      ConfigurationService.Default,
      PolicyService.Default
    ),
    NodeFileSystem.layer
  );

  const withLayers = <E, A>(effect: Effect.Effect<A, E, any>) =>
    effect.pipe(Effect.provide(testLayer));

  it("should load policy configuration", () =>
    withLayers(Effect.gen(function* () {
      const configService = yield* ConfigurationService;
      const masterConfig = yield* configService.getMasterConfig();
      const policyConfig = yield* configService.loadPolicyConfig(masterConfig.configPaths?.policy || "./config/policies.json");
      expect(policyConfig).toBeDefined();
      expect(policyConfig.policies).toHaveLength(2);
    }))
  );

  it("should check policy with rate limit", () =>
    withLayers(Effect.gen(function* () {
      const service = yield* PolicyService;
      const context: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "chat",
        tags: { provider: "openai" }
      };

      const result = yield* service.checkPolicy(context);
      expect(result.allowed).toBe(true);
    }))
  );

  it("should deny operation exceeding cost limits", () =>
    withLayers(Effect.gen(function* () {
      const service = yield* PolicyService;
      const context: PolicyCheckContext = {
        auth: { userId: "test-user" },
        requestedModel: "gpt-4",
        operationType: "chat",
        tags: {
          provider: "openai",
          "cost.total": 20.0
        }
      };

      const result = yield* service.checkPolicy(context);
      expect(result.allowed).toBe(false);
    }))
  );

  describe("rule management", () => {
    it("should create a new rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;
        const rule = {
          name: "Test Rule",
          description: "Test rule description",
          type: "allow" as const,
          resource: "*",
          priority: 100,
          enabled: true
        };

        const created = yield* service.createRule(rule);
        expect(created.data.name).toBe(rule.name);
        expect(created.data.description).toBe(rule.description);
      })));

    it("should get an existing rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;
        const rule = {
          name: "Test Rule",
          description: "Test rule description",
          type: "allow" as const,
          resource: "*",
          priority: 100,
          enabled: true
        };

        const created = yield* service.createRule(rule);
        const retrieved = yield* service.getRule(created.id);
        expect(Option.isSome(retrieved)).toBe(true);
        if (Option.isSome(retrieved)) {
          expect(retrieved.value.data.name).toBe(rule.name);
        }
      })));

    it("should return None for non-existent rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;
        const retrieved = yield* service.getRule("non-existent-rule-id");
        expect(Option.isNone(retrieved)).toBe(true);
      })));

    it("should update an existing rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;

        // First create a rule
        const newRule = {
          name: "Update Test Rule",
          description: "A rule to test updates",
          type: "allow" as const,
          resource: "*",
          enabled: true,
          conditions: "test.value == original",
          priority: 150
        };

        const created = yield* service.createRule(newRule);

        // Then update it
        const updates = {
          name: "Updated Test Rule",
          enabled: false,
          conditions: "test.value == updated"
        };

        const updated = yield* service.updateRule(created.id, updates);
        expect(updated.data.name).toBe(updates.name);
        expect(updated.data.enabled).toBe(false);
        expect(updated.data.conditions).toEqual(updates.conditions);
        expect(updated.data.description).toBe(newRule.description); // Should remain unchanged
      })));

    it("should delete an existing rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;

        // First create a rule
        const newRule = {
          name: "Delete Test Rule",
          description: "A rule to test deletion",
          type: "deny" as const,
          resource: "*",
          enabled: true,
          conditions: "delete.test == true",
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
      })));

    it("should return None when deleting non-existent rule", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;
        const deleted = yield* service.deleteRule("non-existent-rule-id");
        expect(Option.isNone(deleted)).toBe(true);
      })));
  });

  describe("resetAll", () => {
    it("should reset all service state", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;

        // Create some rules first
        const rule1 = {
          name: "Rule 1",
          description: "First rule",
          type: "allow" as const,
          resource: "*",
          enabled: true,
          conditions: "test == 1",
          priority: 100
        };

        const rule2 = {
          name: "Rule 2",
          description: "Second rule",
          type: "deny" as const,
          resource: "*",
          enabled: true,
          conditions: "test == 2",
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
      })));
  });

  describe("shutdown", () => {
    it("should shutdown successfully", () =>
      withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.shutdown(); // Should not throw
      })));
  });

  describe("configuration edge cases", () => {
    it("should handle empty policy configuration", () => {
      // Point to config with empty rules
      process.env.POLICY_CONFIG_PATH = join(testDir, "empty-policy.json");

      return withLayers(Effect.gen(function* () {
        const service = yield* PolicyService;

        // Should still work for basic operations
        const context: PolicyCheckContext = {
          auth: { userId: "test-user" },
          requestedModel: "gpt-4",
          operationType: "chat",
          tags: { provider: "openai" }
        };

        const result = yield* service.checkPolicy(context);
        // With no rules, should default to allow
        expect(result.allowed).toBe(true);
      }));
    });

    it("should handle missing configuration file", () => {
      // Point to non-existent config file  
      process.env.POLICY_CONFIG_PATH = join(testDir, "missing.json");

      return withLayers(Effect.gen(function* () {
        const result = yield* Effect.either(Effect.gen(function* () {
          const service = yield* PolicyService;
          return yield* service.healthCheck();
        }));

        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(PolicyError);
        }
      }));
    });
  });
});
