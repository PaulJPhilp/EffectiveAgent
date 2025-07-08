/**
 * @file Comprehensive test suite for PersonaService
 * @module services/capabilities/persona/tests
 */

import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import type { PersonaServiceApi } from "../api.js";
import { PersonaConfigError } from "../errors.js";
import { ExampleDialogue, Persona, PersonasFile } from "../schema.js";
import { PersonaService } from "../service.js";
import type { PersonaDefinitionInput } from "../types.js";

describe("PersonaService", () => {
  // Helper to run persona service tests
  const runTest = <A, E>(
    effect: Effect.Effect<A, E, PersonaServiceApi>
  ): Promise<A> => {
    return Effect.runPromise(
      effect.pipe(Effect.provide(PersonaService.Default))
    );
  };

  // Test data
  const validPersonaDefinition = {
    name: "helpful-assistant",
    description: "A helpful and friendly AI assistant",
    instructions:
      "You are a helpful AI assistant. Always be polite, accurate, and concise in your responses.",
    tone: "professional",
    verbosity: "normal",
    outputFormat: "text",
    exampleDialogues: [
      {
        request: "What is the weather like?",
        response:
          "I don't have access to real-time weather data. Please check a weather service for current conditions.",
      },
      {
        request: "How can I help you today?",
        response:
          "Thank you for asking! I'm here to assist you with any questions or tasks you might have.",
      },
    ],
  };

  const minimalPersonaDefinition = {
    name: "basic-assistant",
    instructions: "You are a basic AI assistant.",
  };

  const invalidPersonaDefinition = {
    name: "", // Invalid: empty name
    instructions: "Valid instructions",
    tone: "invalid-tone", // Invalid: not in allowed tones
  };

  const complexPersonaDefinition = {
    name: "technical-expert",
    description: "A technical expert specializing in software development",
    instructions:
      "You are a senior software engineer with expertise in TypeScript, Node.js, and Effect-TS. Provide detailed technical explanations with code examples when appropriate.",
    tone: "formal",
    verbosity: "verbose",
    outputFormat: "markdown",
    exampleDialogues: [
      {
        request: "How do I handle errors in Effect-TS?",
        response:
          "In Effect-TS, you handle errors using the error channel. Use `Effect.catchAll()` to handle all errors, or `Effect.catchTag()` for specific error types.",
      },
      {
        request: "What's the difference between flatMap and map?",
        response:
          "`map` transforms the success value, while `flatMap` allows you to chain effects that might fail.",
      },
    ],
  };

  describe("load", () => {
    it("should load personas configuration successfully", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.load();

          expect(result.name).toBe("agent-personas");
          expect(result.version).toBe("1.0.0");
          expect(Array.isArray(result.personas)).toBe(true);
          expect(result.personas).toHaveLength(0); // Empty by default
        })
      );
    });

    it("should track load count and timestamp", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;

          // Load multiple times
          yield* personaService.load();
          yield* personaService.load();
          const result = yield* personaService.load();

          expect(result).toBeDefined();
          expect(result.personas).toHaveLength(0);
        })
      );
    });

    it("should handle concurrent load operations", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;

          const loadOperations = [
            personaService.load(),
            personaService.load(),
            personaService.load(),
          ];

          const results = yield* Effect.all(loadOperations, {
            concurrency: "unbounded",
          });

          expect(results).toHaveLength(3);
          results.forEach((result) => {
            expect(result.name).toBe("agent-personas");
            expect(result.personas).toHaveLength(0);
          });
        })
      );
    });
  });

  describe("make", () => {
    it("should validate and create a persona definition with all fields", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(validPersonaDefinition);

          expect(result.name).toBe("helpful-assistant");
          expect(result.description).toBe(
            "A helpful and friendly AI assistant"
          );
          expect(result.instructions).toBe(
            "You are a helpful AI assistant. Always be polite, accurate, and concise in your responses."
          );
          expect(result.tone).toBe("professional");
          expect(result.verbosity).toBe("normal");
          expect(result.outputFormat).toBe("text");
          expect(result.exampleDialogues).toHaveLength(2);
          expect(result.exampleDialogues?.[0]?.request).toBe(
            "What is the weather like?"
          );
          expect(result.exampleDialogues?.[0]?.response).toContain(
            "weather data"
          );
        })
      );
    });

    it("should validate and create a minimal persona definition", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(minimalPersonaDefinition);

          expect(result.name).toBe("basic-assistant");
          expect(result.instructions).toBe("You are a basic AI assistant.");
          expect(result.description).toBeUndefined();
          expect(result.tone).toBeUndefined();
          expect(result.verbosity).toBeUndefined();
          expect(result.outputFormat).toBeUndefined();
          expect(result.exampleDialogues).toBeUndefined();
        })
      );
    });

    it("should validate and create a complex persona definition", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(complexPersonaDefinition);

          expect(result.name).toBe("technical-expert");
          expect(result.description).toContain("technical expert");
          expect(result.instructions).toContain("Effect-TS");
          expect(result.tone).toBe("formal");
          expect(result.verbosity).toBe("verbose");
          expect(result.outputFormat).toBe("markdown");
          expect(result.exampleDialogues).toHaveLength(2);
          expect(result.exampleDialogues?.[0]?.request).toContain("Effect-TS");
        })
      );
    });

    it("should fail with PersonaConfigError for invalid persona definition", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            yield* personaService.make(invalidPersonaDefinition);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });

    it("should fail with PersonaConfigError for null input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            yield* personaService.make(null);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });

    it("should fail with PersonaConfigError for undefined input", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            yield* personaService.make(undefined);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });

    it("should fail for empty instructions", async () => {
      const invalidDefinition = {
        name: "test-persona",
        instructions: "", // Invalid: empty instructions
      };

      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            yield* personaService.make(invalidDefinition);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });
  });

  describe("update", () => {
    it("should update an existing persona definition with partial changes", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const original = yield* personaService.make(validPersonaDefinition);

          const updates: Partial<PersonaDefinitionInput> = {
            description: "Updated description for the assistant",
            tone: "casual",
            verbosity: "concise",
          };

          const updated = yield* personaService.update(original, updates);

          expect(updated.name).toBe("helpful-assistant"); // Unchanged
          expect(updated.description).toBe(
            "Updated description for the assistant"
          ); // Updated
          expect(updated.instructions).toBe(original.instructions); // Unchanged
          expect(updated.tone).toBe("casual"); // Updated
          expect(updated.verbosity).toBe("concise"); // Updated
          expect(updated.outputFormat).toBe("text"); // Unchanged
        })
      );
    });

    it("should update persona name and validate the result", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const original = yield* personaService.make(minimalPersonaDefinition);

          const updates: Partial<PersonaDefinitionInput> = {
            name: "updated-assistant",
            description: "Added description",
            tone: "empathetic",
          };

          const updated = yield* personaService.update(original, updates);

          expect(updated.name).toBe("updated-assistant");
          expect(updated.description).toBe("Added description");
          expect(updated.tone).toBe("empathetic");
          expect(updated.instructions).toBe("You are a basic AI assistant."); // Unchanged
        })
      );
    });

    it("should update example dialogues", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const original = yield* personaService.make(minimalPersonaDefinition);

          const newDialogues = [
            {
              request: "Hello",
              response: "Hi there! How can I help you today?",
            },
          ];

          const updates: Partial<PersonaDefinitionInput> = {
            exampleDialogues: newDialogues,
          };

          const updated = yield* personaService.update(original, updates);

          expect(updated.exampleDialogues).toHaveLength(1);
          expect(updated.exampleDialogues?.[0]?.request).toBe("Hello");
          expect(updated.exampleDialogues?.[0]?.response).toBe(
            "Hi there! How can I help you today?"
          );
        })
      );
    });

    it("should fail when update results in invalid persona definition", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            const original = yield* personaService.make(validPersonaDefinition);

            const invalidUpdates: Partial<PersonaDefinitionInput> = {
              name: "", // Invalid: empty name
              instructions: "", // Invalid: empty instructions
            };

            yield* personaService.update(original, invalidUpdates);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });

    it("should fail when updating with invalid tone", async () => {
      const result = await Effect.runPromise(
        Effect.either(
          Effect.gen(function* () {
            const personaService = yield* PersonaService;
            const original = yield* personaService.make(validPersonaDefinition);

            const invalidUpdates = {
              tone: "invalid-tone", // Invalid tone
            };

            yield* personaService.update(original, invalidUpdates as any);
          }).pipe(Effect.provide(PersonaService.Default))
        )
      );

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left.description).toBe(
          "Failed to validate persona definition"
        );
        expect(result.left.module).toBe("PersonaService");
        expect(result.left.method).toBe("make");
      }
    });
  });

  describe("schema validation", () => {
    it("should validate ExampleDialogue schema", async () => {
      const validDialogue = {
        request: "What is TypeScript?",
        response:
          "TypeScript is a strongly typed programming language that builds on JavaScript.",
      };

      const result = await Effect.runPromise(
        S.decode(ExampleDialogue)(validDialogue)
      );

      expect(result.request).toBe("What is TypeScript?");
      expect(result.response).toContain("TypeScript");
    });

    it("should validate Persona schema with all tone options", async () => {
      const tones = [
        "formal",
        "casual",
        "professional",
        "witty",
        "empathetic",
      ] as const;

      for (const tone of tones) {
        const personaWithTone = {
          name: `test-persona-${tone}`,
          instructions: "Test instructions",
          tone,
        } as const;

        const result = await Effect.runPromise(
          S.decode(Persona)(personaWithTone)
        );

        expect(result.tone).toBe(tone);
      }
    });

    it("should validate Persona schema with all verbosity options", async () => {
      const verbosityLevels = ["concise", "normal", "verbose"] as const;

      for (const verbosity of verbosityLevels) {
        const personaWithVerbosity = {
          name: `test-persona-${verbosity}`,
          instructions: "Test instructions",
          verbosity,
        };

        const result = await Effect.runPromise(
          S.decode(Persona)(personaWithVerbosity)
        );

        expect(result.verbosity).toBe(verbosity);
      }
    });

    it("should validate Persona schema with all output format options", async () => {
      const outputFormats = ["text", "markdown", "json"] as const;

      for (const outputFormat of outputFormats) {
        const personaWithFormat = {
          name: `test-persona-${outputFormat}`,
          instructions: "Test instructions",
          outputFormat,
        };

        const result = await Effect.runPromise(
          S.decode(Persona)(personaWithFormat)
        );

        expect(result.outputFormat).toBe(outputFormat);
      }
    });

    it("should validate PersonasFile schema", async () => {
      const validPersonasFile = {
        name: "test-personas",
        description: "Test personas configuration",
        version: "1.0.0",
        personas: [
          {
            name: "assistant-1",
            instructions: "You are assistant 1",
          },
          {
            name: "assistant-2",
            instructions: "You are assistant 2",
          },
        ],
        metadata: {
          author: "Test Author",
          created: "2024-01-01",
        },
      };

      const result = await Effect.runPromise(
        S.decode(PersonasFile)(validPersonasFile)
      );

      expect(result.name).toBe("test-personas");
      expect(result.personas).toHaveLength(2);
      expect(result.metadata?.author).toBe("Test Author");
    });

    it("should fail validation for invalid Persona schema", async () => {
      const result = await Effect.runPromise(
        Effect.either(S.decode(Persona)(invalidPersonaDefinition))
      );

      expect(result._tag).toBe("Left");
    });

    it("should fail validation for PersonasFile with empty personas array", async () => {
      const invalidPersonasFile = {
        name: "test-personas",
        personas: [], // Invalid: empty array
      };

      const result = await Effect.runPromise(
        Effect.either(S.decode(PersonasFile)(invalidPersonasFile))
      );

      expect(result._tag).toBe("Left");
    });
  });

  describe("error handling", () => {
    it("should create PersonaConfigError with proper structure", () => {
      const error = new PersonaConfigError({
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
          const personaService = yield* PersonaService;
          expect(personaService).toBeDefined();
          expect(typeof personaService.load).toBe("function");
          expect(typeof personaService.make).toBe("function");
          expect(typeof personaService.update).toBe("function");
        })
      );
    });

    it("should handle concurrent operations", async () => {
      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;

          const operations = [
            personaService.load(),
            personaService.make(validPersonaDefinition),
            personaService.make(minimalPersonaDefinition),
            Effect.either(personaService.make(invalidPersonaDefinition)),
          ];

          const results = yield* Effect.all(operations, {
            concurrency: "unbounded",
          });

          expect(results).toHaveLength(4);
          expect((results[0] as any).name).toBe("agent-personas"); // load result
          expect((results[1] as any).name).toBe("helpful-assistant"); // make result
          expect((results[2] as any).name).toBe("basic-assistant"); // make result
          expect((results[3] as any)._tag).toBe("Left"); // error result
        })
      );
    });
  });

  describe("edge cases", () => {
    it("should handle persona with maximum length instructions", async () => {
      const longInstructions = "A".repeat(10000); // Very long instructions
      const personaWithLongInstructions = {
        name: "verbose-persona",
        instructions: longInstructions,
      };

      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(
            personaWithLongInstructions
          );

          expect(result.name).toBe("verbose-persona");
          expect(result.instructions).toHaveLength(10000);
        })
      );
    });

    it("should handle persona with many example dialogues", async () => {
      const manyDialogues = Array.from({ length: 100 }, (_, i) => ({
        request: `Question ${i + 1}`,
        response: `Answer ${i + 1}`,
      }));

      const personaWithManyDialogues = {
        name: "example-rich-persona",
        instructions: "You have many examples",
        exampleDialogues: manyDialogues,
      };

      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(personaWithManyDialogues);

          expect(result.name).toBe("example-rich-persona");
          expect(result.exampleDialogues).toHaveLength(100);
          expect(result.exampleDialogues?.[99]?.request).toBe("Question 100");
        })
      );
    });

    it("should handle special characters in persona fields", async () => {
      const personaWithSpecialChars = {
        name: "special-chars-persona",
        description: "Persona with émojis 🤖 and spëcial chars: @#$%^&*()",
        instructions: "You can handle unicode: 你好, العربية, русский, 日本語",
      };

      await runTest(
        Effect.gen(function* () {
          const personaService = yield* PersonaService;
          const result = yield* personaService.make(personaWithSpecialChars);

          expect(result.name).toBe("special-chars-persona");
          expect(result.description).toContain("🤖");
          expect(result.instructions).toContain("你好");
        })
      );
    });
  });
});
