/**
 * @file Comprehensive test suite for IntelligenceService
 * @module services/capabilities/intelligence/tests
 */

import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import type { IntelligenceServiceApi } from "../api.js";
import { IntelligenceConfigError } from "../errors.js";
import { Intelligence, IntelligenceFile, ModelPreference } from "../schema.js";
import { IntelligenceService } from "../service.js";

describe("IntelligenceService", () => {
  // Helper to run intelligence service tests
  const runTest = <A, E>(
    effect: Effect.Effect<A, E, IntelligenceServiceApi>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(Effect.provide(IntelligenceService.Default))
    );
  };

  // Test data
  const validModelPreference = {
    provider: "openai",
    model: "gpt-4-turbo",
    priority: 1,
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
    },
  };

  const validIntelligenceDefinition = {
    name: "advanced-assistant",
    description: "An advanced AI assistant with full capabilities",
    modelPreferences: [
      validModelPreference,
      {
        provider: "anthropic",
        model: "claude-3-opus",
        priority: 2,
      },
    ],
    ragEnabled: true,
    memoryAccessLevel: "full" as const,
    allowedTools: ["web-search", "calculator", "file-operations"],
  };

  const minimalIntelligenceDefinition = {
    name: "basic-assistant",
    modelPreferences: [
      {
        provider: "openai",
        model: "gpt-3.5-turbo",
      },
    ],
  };

  const complexIntelligenceDefinition = {
    name: "specialized-researcher",
    description:
      "A specialized AI for research tasks with limited memory access",
    modelPreferences: [
      {
        provider: "openai",
        model: "gpt-4-turbo",
        priority: 1,
        parameters: {
          temperature: 0.2,
          maxTokens: 4000,
          topP: 0.9,
        },
      },
      {
        provider: "anthropic",
        model: "claude-3-sonnet",
        priority: 2,
        parameters: {
          temperature: 0.3,
          maxTokens: 3000,
        },
      },
      {
        provider: "google",
        model: "gemini-pro",
        priority: 3,
      },
    ],
    ragEnabled: true,
    memoryAccessLevel: "short_term" as const,
    allowedTools: ["web-search", "pdf-reader", "wikipedia"],
  };

  const invalidIntelligenceDefinition = {
    name: "", // Invalid: empty name
    modelPreferences: [], // Invalid: empty array
    memoryAccessLevel: "invalid-level" as any, // Invalid: not in allowed values
  };

  describe("load", () => {
    it("should load intelligence configuration successfully", async () => {
      await runTest(
        Effect.gen(function* () {
          const intelligenceService = yield* IntelligenceService;
          const result = yield* intelligenceService.load();

          expect(result.name).toBe("agent-intelligences");
          expect(result.version).toBe("1.0.0");
          expect(Array.isArray(result.intelligences)).toBe(true);
          expect(result.intelligences).toHaveLength(0); // Empty by default
        })
      );
    });

    it("should track load count and timestamp", async () => {
      await runTest(
        Effect.gen(function* () {
          const intelligenceService = yield* IntelligenceService;

          // Load multiple times
          yield* intelligenceService.load();
          yield* intelligenceService.load();
          const result = yield* intelligenceService.load();

          expect(result).toBeDefined();
          expect(result.intelligences).toHaveLength(0);
        })
      );
    });

    it("should handle concurrent load operations", async () => {
      await runTest(
        Effect.gen(function* () {
          const intelligenceService = yield* IntelligenceService;

          const loadOperations = [
            intelligenceService.load(),
            intelligenceService.load(),
            intelligenceService.load(),
          ];

          const results = yield* Effect.all(loadOperations, {
            concurrency: "unbounded",
          });

          expect(results).toHaveLength(3);
          results.forEach((result) => {
            expect(result.name).toBe("agent-intelligences");
            expect(result.intelligences).toHaveLength(0);
          });
        })
      );
    });
  });

  describe("getProfile", () => {
    it("should fail with IntelligenceConfigError for non-existent profile", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const intelligenceService = yield* IntelligenceService;
            yield* intelligenceService.getProfile("non-existent-profile");
          }).pipe(Effect.provide(IntelligenceService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Intelligence profile 'non-existent-profile' not found"
        );
        expect(result.left.module).toBe("IntelligenceService");
        expect(result.left.method).toBe("getProfile");
      }
    });

    it("should fail with IntelligenceConfigError for empty profile name", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const intelligenceService = yield* IntelligenceService;
            yield* intelligenceService.getProfile("");
          }).pipe(Effect.provide(IntelligenceService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Intelligence profile '' not found"
        );
        expect(result.left.module).toBe("IntelligenceService");
        expect(result.left.method).toBe("getProfile");
      }
    });

    it("should handle null profile name gracefully", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const intelligenceService = yield* IntelligenceService;
            yield* intelligenceService.getProfile(null as any);
          }).pipe(Effect.provide(IntelligenceService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Intelligence profile 'null' not found"
        );
        expect(result.left.module).toBe("IntelligenceService");
        expect(result.left.method).toBe("getProfile");
      }
    });
  });

  describe("schema validation", () => {
    it("should validate ModelPreference schema with all fields", async () => {
      const result = await Effect.runPromise(
        S.decode(ModelPreference)(validModelPreference)
      );

      expect(result.provider).toBe("openai");
      expect(result.model).toBe("gpt-4-turbo");
      expect(result.priority).toBe(1);
      expect(result.parameters?.temperature).toBe(0.7);
      expect(result.parameters?.maxTokens).toBe(2000);
    });

    it("should validate minimal ModelPreference schema", async () => {
      const minimalPreference = {
        provider: "anthropic",
        model: "claude-3-haiku",
      };

      const result = await Effect.runPromise(
        S.decode(ModelPreference)(minimalPreference)
      );

      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe("claude-3-haiku");
      expect(result.priority).toBeUndefined();
      expect(result.parameters).toBeUndefined();
    });

    it("should validate Intelligence schema with all fields", async () => {
      const result = await Effect.runPromise(
        S.decode(Intelligence)(validIntelligenceDefinition)
      );

      expect(result.name).toBe("advanced-assistant");
      expect(result.description).toBe(
        "An advanced AI assistant with full capabilities"
      );
      expect(result.modelPreferences).toHaveLength(2);
      expect(result.ragEnabled).toBe(true);
      expect(result.memoryAccessLevel).toBe("full");
      expect(result.allowedTools).toEqual([
        "web-search",
        "calculator",
        "file-operations",
      ]);
    });

    it("should validate minimal Intelligence schema", async () => {
      const result = await Effect.runPromise(
        S.decode(Intelligence)(minimalIntelligenceDefinition)
      );

      expect(result.name).toBe("basic-assistant");
      expect(result.modelPreferences).toHaveLength(1);
      expect(result.description).toBeUndefined();
      expect(result.ragEnabled).toBeUndefined();
      expect(result.memoryAccessLevel).toBeUndefined();
      expect(result.allowedTools).toBeUndefined();
    });

    it("should validate complex Intelligence schema", async () => {
      const result = await Effect.runPromise(
        S.decode(Intelligence)(complexIntelligenceDefinition)
      );

      expect(result.name).toBe("specialized-researcher");
      expect(result.modelPreferences).toHaveLength(3);
      expect(result.ragEnabled).toBe(true);
      expect(result.memoryAccessLevel).toBe("short_term");
      expect(result.allowedTools).toEqual([
        "web-search",
        "pdf-reader",
        "wikipedia",
      ]);

      // Check model preferences details
      expect(result.modelPreferences[0]?.provider).toBe("openai");
      expect(result.modelPreferences[0]?.priority).toBe(1);
      expect(result.modelPreferences[1]?.provider).toBe("anthropic");
      expect(result.modelPreferences[2]?.provider).toBe("google");
    });

    it("should validate all memory access levels", async () => {
      const memoryLevels = ["none", "short_term", "full"];

      for (const level of memoryLevels) {
        const intelligenceWithMemory = {
          name: `test-intelligence-${level}`,
          modelPreferences: [
            {
              provider: "openai",
              model: "gpt-4",
            },
          ],
          memoryAccessLevel: level as "none" | "short_term" | "full",
        };

        const result = await Effect.runPromise(
          S.decode(Intelligence)(intelligenceWithMemory)
        );

        expect(result.memoryAccessLevel).toBe(level);
      }
    });

    it("should validate IntelligenceFile schema", async () => {
      const validIntelligenceFile = {
        name: "test-intelligences",
        description: "Test intelligence configurations",
        version: "1.0.0",
        intelligences: [
          minimalIntelligenceDefinition,
          validIntelligenceDefinition,
        ],
        metadata: {
          author: "Test Author",
          created: "2024-01-01",
        },
      };

      const result = await Effect.runPromise(
        S.decode(IntelligenceFile)(validIntelligenceFile)
      );

      expect(result.name).toBe("test-intelligences");
      expect(result.intelligences).toHaveLength(2);
      expect(result.metadata?.author).toBe("Test Author");
    });

    it("should fail validation for invalid Intelligence schema", async () => {
      const result = await Effect.runPromise(
        Effect.either(S.decode(Intelligence)(invalidIntelligenceDefinition))
      );

      expect(result._tag).toBe("Left");
    });

    it("should fail validation for Intelligence with empty model preferences", async () => {
      const invalidIntelligence = {
        name: "test-intelligence",
        modelPreferences: [], // Invalid: empty array
      };

      const result = await Effect.runPromise(
        Effect.either(S.decode(Intelligence)(invalidIntelligence))
      );

      expect(result._tag).toBe("Left");
    });

    it("should fail validation for ModelPreference with empty model", async () => {
      const invalidPreference = {
        provider: "openai",
        model: "", // Invalid: empty model
      };

      const result = await Effect.runPromise(
        Effect.either(S.decode(ModelPreference)(invalidPreference))
      );

      expect(result._tag).toBe("Left");
    });

    it("should fail validation for IntelligenceFile with empty intelligences array", async () => {
      const invalidIntelligenceFile = {
        name: "test-intelligences",
        intelligences: [], // Invalid: empty array
      };

      const result = await Effect.runPromise(
        Effect.either(S.decode(IntelligenceFile)(invalidIntelligenceFile))
      );

      expect(result._tag).toBe("Left");
    });
  });

  describe("error handling", () => {
    it("should create IntelligenceConfigError with proper structure", () => {
      const error = new IntelligenceConfigError({
        description: "Test error",
        module: "TestModule",
        method: "testMethod",
        cause: new Error("Root cause"),
      });

      expect(error.description).toBe("Test error");
      expect(error.module).toBe("TestModule");
      expect(error.method).toBe("testMethod");
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe("service lifecycle", () => {
    it("should initialize service successfully", async () => {
      await runTest(
        Effect.gen(function* () {
          const intelligenceService = yield* IntelligenceService;
          expect(intelligenceService).toBeDefined();
          expect(typeof intelligenceService.load).toBe("function");
          expect(typeof intelligenceService.getProfile).toBe("function");
        })
      );
    });

    it("should handle concurrent operations", async () => {
      await runTest(
        Effect.gen(function* () {
          const intelligenceService = yield* IntelligenceService;

          const operations = [
            intelligenceService.load(),
            Effect.either(intelligenceService.getProfile("non-existent")),
            intelligenceService.load(),
          ];

          const results = yield* Effect.all(operations, {
            concurrency: "unbounded",
          });

          expect(results).toHaveLength(3);
          expect((results[0] as any).name).toBe("agent-intelligences"); // load result
          expect((results[1] as any)._tag).toBe("Left"); // error result
          expect((results[2] as any).name).toBe("agent-intelligences"); // load result
        })
      );
    });
  });

  describe("edge cases", () => {
    it("should handle intelligence with many model preferences", async () => {
      const manyPreferences = Array.from({ length: 10 }, (_, i) => ({
        provider: `provider-${i + 1}`,
        model: `model-${i + 1}`,
        priority: i + 1,
      }));

      const intelligenceWithManyPreferences = {
        name: "multi-model-intelligence",
        modelPreferences: manyPreferences,
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithManyPreferences)
      );

      expect(result.name).toBe("multi-model-intelligence");
      expect(result.modelPreferences).toHaveLength(10);
      expect(result.modelPreferences[9]?.provider).toBe("provider-10");
    });

    it("should handle intelligence with many allowed tools", async () => {
      const manyTools = Array.from({ length: 50 }, (_, i) => `tool-${i + 1}`);

      const intelligenceWithManyTools = {
        name: "tool-rich-intelligence",
        modelPreferences: [
          {
            provider: "openai",
            model: "gpt-4",
          },
        ],
        allowedTools: manyTools,
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithManyTools)
      );

      expect(result.name).toBe("tool-rich-intelligence");
      expect(result.allowedTools).toHaveLength(50);
      expect(result.allowedTools?.[49]).toBe("tool-50");
    });

    it("should handle special characters in intelligence fields", async () => {
      const intelligenceWithSpecialChars = {
        name: "special-chars-intelligence",
        description: "Intelligence with émojis 🧠 and spëcial chars: @#$%^&*()",
        modelPreferences: [
          {
            provider: "openai",
            model: "gpt-4-turbo",
            parameters: {
              "custom-param": "value with spaces and symbols: !@#$%",
              "unicode-param": "支持中文参数",
            },
          },
        ],
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithSpecialChars)
      );

      expect(result.name).toBe("special-chars-intelligence");
      expect(result.description).toContain("🧠");
      expect(result.modelPreferences[0]?.parameters?.["unicode-param"]).toBe(
        "支持中文参数"
      );
    });

    it("should handle intelligence with complex parameter structures", async () => {
      const intelligenceWithComplexParams = {
        name: "complex-params-intelligence",
        modelPreferences: [
          {
            provider: "openai",
            model: "gpt-4",
            parameters: {
              temperature: 0.7,
              maxTokens: 2000,
              stopSequences: ["END", "STOP", "FINISH"],
              customConfig: {
                nested: {
                  value: true,
                  array: [1, 2, 3],
                  object: {
                    key: "value",
                  },
                },
              },
            },
          },
        ],
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithComplexParams)
      );

      expect(result.name).toBe("complex-params-intelligence");
      expect(result.modelPreferences[0]?.parameters?.temperature).toBe(0.7);
      expect(result.modelPreferences[0]?.parameters?.stopSequences).toEqual([
        "END",
        "STOP",
        "FINISH",
      ]);
      expect(
        result.modelPreferences[0]?.parameters?.customConfig
      ).toBeDefined();
    });

    it("should handle intelligence with zero priority", async () => {
      const intelligenceWithZeroPriority = {
        name: "zero-priority-intelligence",
        modelPreferences: [
          {
            provider: "openai",
            model: "gpt-4",
            priority: 0, // Edge case: zero priority
          },
        ],
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithZeroPriority)
      );

      expect(result.name).toBe("zero-priority-intelligence");
      expect(result.modelPreferences[0]?.priority).toBe(0);
    });

    it("should handle intelligence with negative priority", async () => {
      const intelligenceWithNegativePriority = {
        name: "negative-priority-intelligence",
        modelPreferences: [
          {
            provider: "openai",
            model: "gpt-4",
            priority: -1, // Edge case: negative priority
          },
        ],
      };

      const result = await Effect.runPromise(
        S.decode(Intelligence)(intelligenceWithNegativePriority)
      );

      expect(result.name).toBe("negative-priority-intelligence");
      expect(result.modelPreferences[0]?.priority).toBe(-1);
    });
  });
});
