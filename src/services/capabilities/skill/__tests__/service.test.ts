/**
 * @file Comprehensive test suite for SkillService
 * @module services/capabilities/skill/tests
 */

import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import type { SkillServiceApi } from "../api.js";
import {
  SkillConfigError,
  SkillInputValidationError,
  SkillNotFoundError,
  SkillOutputValidationError,
} from "../errors.js";
import { Skill, SkillExecutionParams } from "../schema.js";
import { SkillService } from "../service.js";
import type { SkillName } from "../types.js";

describe("SkillService", () => {
  // Helper to run skill service tests
  const runTest = <A, E>(
    effect: Effect.Effect<A, E, SkillServiceApi>
  ): Promise<A> => {
    return Effect.runPromise(effect.pipe(Effect.provide(SkillService.Default)));
  };

  // Test data
  const validSkillDefinition = {
    name: "test-skill",
    description: "A test skill for validation",
    intelligenceName: "gpt-4",
    personaName: "helpful-assistant",
    promptTemplateName: "basic-template",
    systemPromptOverride: "You are a test assistant",
    defaultParams: {
      temperature: 0.7,
      maxTokens: 100,
    },
    inputSchemaRef: "test-input-schema",
    outputSchemaRef: "test-output-schema",
    metadata: {
      category: "test",
      version: "1.0.0",
    },
  };

  const minimalSkillDefinition = {
    name: "minimal-skill",
    intelligenceName: "gpt-3.5-turbo",
    promptTemplateName: "minimal-template",
  };

  const invalidSkillDefinition = {
    name: "", // Invalid: empty name
    intelligenceName: "gpt-4",
    promptTemplateName: "test-template",
  };

  describe("make", () => {
    it("should validate and create a skill definition with all fields", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;
          const result = yield* skillService.make(validSkillDefinition);

          expect(result.name).toBe("test-skill");
          expect(result.description).toBe("A test skill for validation");
          expect(result.intelligenceName).toBe("gpt-4");
          expect(result.personaName).toBe("helpful-assistant");
          expect(result.promptTemplateName).toBe("basic-template");
          expect(result.systemPromptOverride).toBe("You are a test assistant");
          expect(result.defaultParams?.temperature).toBe(0.7);
          expect(result.defaultParams?.maxTokens).toBe(100);
          expect(result.inputSchemaRef).toBe("test-input-schema");
          expect(result.outputSchemaRef).toBe("test-output-schema");
          expect(result.metadata?.category).toBe("test");
          expect(result.metadata?.version).toBe("1.0.0");
        })
      );
    });

    it("should validate and create a minimal skill definition", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;
          const result = yield* skillService.make(minimalSkillDefinition);

          expect(result.name).toBe("minimal-skill");
          expect(result.intelligenceName).toBe("gpt-3.5-turbo");
          expect(result.promptTemplateName).toBe("minimal-template");
          expect(result.description).toBeUndefined();
          expect(result.personaName).toBeUndefined();
          expect(result.systemPromptOverride).toBeUndefined();
          expect(result.defaultParams).toBeUndefined();
        })
      );
    });

    it("should fail with SkillConfigError for invalid skill definition", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.make(invalidSkillDefinition);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillConfigError);
        expect(result.left.description).toBe(
          "Failed to validate skill definition"
        );
        expect(result.left.module).toBe("SkillService");
        expect(result.left.method).toBe("make");
      }
    });

    it("should fail with SkillConfigError for null input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.make(null);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillConfigError);
      }
    });

    it("should fail with SkillConfigError for undefined input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.make(undefined);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillConfigError);
      }
    });
  });

  describe("update", () => {
    it("should update an existing skill definition with partial changes", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;
          const original = yield* skillService.make(validSkillDefinition);

          const updates = {
            description: "Updated description",
            defaultParams: {
              temperature: 0.9,
              maxTokens: 200,
            },
          };

          const updated = yield* skillService.update(original, updates);

          expect(updated.name).toBe("test-skill"); // Unchanged
          expect(updated.description).toBe("Updated description"); // Updated
          expect(updated.intelligenceName).toBe("gpt-4"); // Unchanged
          expect(updated.defaultParams?.temperature).toBe(0.9); // Updated
          expect(updated.defaultParams?.maxTokens).toBe(200); // Updated
        })
      );
    });

    it("should update skill name and validate the result", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;
          const original = yield* skillService.make(minimalSkillDefinition);

          const updates = {
            name: "updated-skill-name",
            description: "Added description",
          };

          const updated = yield* skillService.update(original, updates);

          expect(updated.name).toBe("updated-skill-name");
          expect(updated.description).toBe("Added description");
          expect(updated.intelligenceName).toBe("gpt-3.5-turbo"); // Unchanged
        })
      );
    });

    it("should fail when update results in invalid skill definition", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            const original = yield* skillService.make(validSkillDefinition);

            const invalidUpdates = {
              name: "", // Invalid: empty name
              intelligenceName: "", // Invalid: empty intelligence name
            };

            yield* skillService.update(original, invalidUpdates);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillConfigError);
      }
    });
  });

  describe("getSkill", () => {
    it("should fail with SkillNotFoundError for non-existent skill", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.getSkill("non-existent-skill" as SkillName);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
        expect(result.left.description).toBe(
          "Skill not found: non-existent-skill"
        );
        expect(result.left.skillName).toBe("non-existent-skill");
      }
    });

    it("should fail with SkillNotFoundError for empty skill name", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.getSkill("" as SkillName);
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
      }
    });
  });

  describe("invokeSkill", () => {
    it("should fail with SkillNotFoundError when skill doesn't exist", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.invokeSkill({
              skillName: "non-existent-skill" as SkillName,
              input: { test: "data" },
            });
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
        expect(result.left.skillName).toBe("non-existent-skill");
      }
    });

    it("should handle empty input gracefully", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.invokeSkill({
              skillName: "test-skill" as SkillName,
              input: {},
            });
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
      }
    });

    it("should handle null input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.invokeSkill({
              skillName: "test-skill" as SkillName,
              input: null,
            });
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
      }
    });

    it("should handle undefined input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const skillService = yield* SkillService;
            yield* skillService.invokeSkill({
              skillName: "test-skill" as SkillName,
              input: undefined,
            });
          }).pipe(Effect.provide(SkillService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(SkillNotFoundError);
      }
    });
  });

  describe("schema validation", () => {
    it("should validate SkillExecutionParams schema", async () => {
      const validParams = {
        temperature: 0.8,
        maxTokens: 150,
        topP: 0.9,
        topK: 40,
        stopSequences: ["END", "STOP"],
        presencePenalty: 0.1,
        frequencyPenalty: 0.2,
      };

      const result = await Effect.runPromise(
        S.decode(SkillExecutionParams)(validParams)
      );

      expect(result.temperature).toBe(0.8);
      expect(result.maxTokens).toBe(150);
      expect(result.topP).toBe(0.9);
      expect(result.topK).toBe(40);
      expect(result.stopSequences).toEqual(["END", "STOP"]);
      expect(result.presencePenalty).toBe(0.1);
      expect(result.frequencyPenalty).toBe(0.2);
    });

    it("should validate minimal SkillExecutionParams", async () => {
      const minimalParams = {};

      const result = await Effect.runPromise(
        S.decode(SkillExecutionParams)(minimalParams)
      );

      expect(result.temperature).toBeUndefined();
      expect(result.maxTokens).toBeUndefined();
      expect(result.topP).toBeUndefined();
    });

    it("should validate Skill schema with all optional fields", async () => {
      const result = await Effect.runPromise(
        S.decode(Skill)(validSkillDefinition)
      );

      expect(result.name).toBe("test-skill");
      expect(result.description).toBe("A test skill for validation");
      expect(result.intelligenceName).toBe("gpt-4");
      expect(result.personaName).toBe("helpful-assistant");
      expect(result.promptTemplateName).toBe("basic-template");
    });

    it("should fail validation for invalid Skill schema", async () => {
      const result = await Effect.runPromise(
        Effect.either(S.decode(Skill)(invalidSkillDefinition))
      );

      expect(result._tag).toBe("Left");
    });
  });

  describe("error handling", () => {
    it("should create SkillConfigError with proper structure", () => {
      const error = new SkillConfigError({
        description: "Test error",
        module: "TestModule",
        method: "testMethod",
        skillName: "test-skill",
        cause: new Error("Root cause"),
      });

      expect(error._tag).toBe("SkillConfigError");
      expect(error.description).toBe("Test error");
      expect(error.module).toBe("TestModule");
      expect(error.method).toBe("testMethod");
      expect(error.skillName).toBe("test-skill");
      expect(error.cause).toBeInstanceOf(Error);
    });

    it("should create SkillNotFoundError with proper structure", () => {
      const error = new SkillNotFoundError({
        description: "Skill not found",
        skillName: "missing-skill",
      });

      expect(error._tag).toBe("SkillNotFoundError");
      expect(error.description).toBe("Skill not found");
      expect(error.skillName).toBe("missing-skill");
    });

    it("should create SkillInputValidationError with proper structure", () => {
      const error = new SkillInputValidationError({
        description: "Invalid input",
        skillName: "test-skill",
        validationErrors: ["error1", "error2"],
      });

      expect(error._tag).toBe("SkillInputValidationError");
      expect(error.description).toBe("Invalid input");
      expect(error.skillName).toBe("test-skill");
      expect(error.validationErrors).toEqual(["error1", "error2"]);
    });

    it("should create SkillOutputValidationError with proper structure", () => {
      const error = new SkillOutputValidationError({
        description: "Invalid output",
        skillName: "test-skill",
        validationErrors: ["output-error"],
        output: { invalid: "data" },
      });

      expect(error._tag).toBe("SkillOutputValidationError");
      expect(error.description).toBe("Invalid output");
      expect(error.skillName).toBe("test-skill");
      expect(error.validationErrors).toEqual(["output-error"]);
      expect(error.output).toEqual({ invalid: "data" });
    });
  });

  describe("service lifecycle", () => {
    it("should initialize service successfully", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;
          expect(skillService).toBeDefined();
          expect(typeof skillService.make).toBe("function");
          expect(typeof skillService.update).toBe("function");
          expect(typeof skillService.getSkill).toBe("function");
          expect(typeof skillService.invokeSkill).toBe("function");
        })
      );
    });

    it("should handle concurrent operations", async () => {
      await runTest(
        Effect.gen(function* () {
          const skillService = yield* SkillService;

          const operations = [
            skillService.make(validSkillDefinition),
            skillService.make(minimalSkillDefinition),
            Effect.either(skillService.make(invalidSkillDefinition)),
          ];

          const results = yield* Effect.all(operations, {
            concurrency: "unbounded",
          });

          expect(results).toHaveLength(3);
          expect((results[0] as any).name).toBe("test-skill");
          expect((results[1] as any).name).toBe("minimal-skill");
          expect((results[2] as any)._tag).toBe("Left");
        })
      );
    });
  });
});
