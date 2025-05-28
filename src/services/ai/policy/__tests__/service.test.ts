import { describe, it } from "vitest";
import { Effect, Option, Layer } from "effect";
import { PolicyService } from "../service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { PolicyRuleData } from "../schema.js";
import { POLICY_SCOPE_USER, PolicyCheckContext } from "../types.js";
import { PolicyError } from "../errors.js";
import { makeTestMasterConfig } from "../../../../core/config/test-helpers.js";

// Create test layer with all required dependencies
const TestLayer = Layer.merge(
  ConfigurationService.Default,
  makeTestMasterConfig({
    configPaths: {
      policy: "config/policy.json",
      models: "config/models.json",
      providers: "config/providers.json"
    }
  })
).pipe(
  Layer.provide(PolicyService.Default)
);

describe("PolicyService Integration Tests", () => {
  // Helper to create a test policy rule
  const createTestRule = (overrides: Partial<PolicyRuleData> = {}): Omit<PolicyRuleData, "id"> => ({
    name: "Test Rule",
    type: "allow",
    resource: "test-resource",
    priority: 1,
    enabled: true,
    description: "Test rule for integration tests",
    ...overrides
  });

  // Helper to create a test policy check context
  const createTestContext = (overrides: Partial<PolicyCheckContext> = {}): PolicyCheckContext => ({
    auth: {
      userId: "test-user",
      tenantId: "test-tenant"
    },
    operationType: "test-operation",
    requestedModel: "test-model",
    ...overrides
  });

  describe("Rule Management", () => {
    it("should create, retrieve, update, and delete a policy rule", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.resetAll();

        // Create
        const ruleData = createTestRule();
        const created = yield* service.createRule(ruleData);
        
        // Get
        const retrieved = yield* service.getRule(created.id);
        if (Option.isNone(retrieved)) {
          throw new Error("Created rule not found");
        }
        
        // Update
        const updated = yield* service.updateRule(created.id, {
          name: "Updated Rule",
          enabled: false
        });
        
        // Delete
        const deleted = yield* service.deleteRule(created.id);
        if (Option.isNone(deleted)) {
          throw new Error("Rule not found for deletion");
        }
        
        // Verify deletion
        const afterDelete = yield* service.getRule(created.id);
        if (Option.isSome(afterDelete)) {
          throw new Error("Rule still exists after deletion");
        }
      }).pipe(
        Effect.provide(TestLayer)
      )
    );

    it("should handle non-existent rule operations gracefully", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.resetAll();

        const nonExistentId = "non-existent";
        
        // Get
        const retrieved = yield* service.getRule(nonExistentId);
        if (Option.isSome(retrieved)) {
          throw new Error("Found non-existent rule");
        }
        
        // Update should fail
        try {
          yield* service.updateRule(nonExistentId, { name: "New Name" });
          throw new Error("Update should have failed");
        } catch (error) {
          if (!(error instanceof PolicyError)) {
            throw new Error("Expected PolicyError");
          }
        }
        
        // Delete should return None
        const deleted = yield* service.deleteRule(nonExistentId);
        if (Option.isSome(deleted)) {
          throw new Error("Deleted non-existent rule");
        }
      }).pipe(
        Effect.provide(TestLayer)
      )
    );
  });

  describe("Policy Checking", () => {
    it("should enforce rate limits", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.resetAll();

        // Create a rate-limited rule
        const ruleData = createTestRule({
          resource: "rate-limited-resource",
          rateLimit: {
            requestsPerMinute: 2,
            scope: POLICY_SCOPE_USER
          }
        });
        yield* service.createRule(ruleData);

        const context = createTestContext({
          operationType: "rate-limited-resource"
        });

        // First request should be allowed
        const result1 = yield* service.checkPolicy(context);
        if (!result1.allowed) {
          throw new Error("First request should be allowed");
        }

        // Second request should be allowed
        const result2 = yield* service.checkPolicy(context);
        if (!result2.allowed) {
          throw new Error("Second request should be allowed");
        }

        // Third request should be denied
        const result3 = yield* service.checkPolicy(context);
        if (result3.allowed) {
          throw new Error("Third request should be denied");
        }
      }).pipe(
        Effect.provide(TestLayer)
      )
    );

    it("should handle multiple policy rules with priorities", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.resetAll();

        // Create a low-priority allow rule
        yield* service.createRule(createTestRule({
          resource: "multi-rule-resource",
          priority: 100,
          type: "allow"
        }));

        // Create a high-priority deny rule
        yield* service.createRule(createTestRule({
          resource: "multi-rule-resource",
          priority: 1,
          type: "deny"
        }));

        const context = createTestContext({
          operationType: "multi-rule-resource"
        });

        // Check should respect priority and deny
        const result = yield* service.checkPolicy(context);
        if (result.allowed) {
          throw new Error("Request should be denied due to high-priority deny rule");
        }
      }).pipe(
        Effect.provide(TestLayer)
      )
    );
  });

  describe("Usage Recording", () => {
    it("should record policy outcomes", () =>
      Effect.gen(function* () {
        const service = yield* PolicyService;
        yield* service.resetAll();

        yield* service.recordOutcome({
          auth: {
            userId: "test-user",
            tenantId: "test-tenant"
          },
          modelUsed: "test-model",
          operationType: "test-operation",
          status: "success",
          latencyMs: 100,
          usage: {
            totalTokens: 50
          }
        });

        // Success case is no error thrown
      }).pipe(
        Effect.provide(TestLayer)
      )
    );
  });
});
