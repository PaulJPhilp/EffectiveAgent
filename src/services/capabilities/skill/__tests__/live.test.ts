/**
 * @file Unit tests for the SkillServiceLiveLayer.
 * @module services/capabilities/skill/__tests__/live.test
 */

import { Effect, Exit, Layer, Scope, Cause, Option, Context } from "effect";
import { describe, it, expect } from "vitest";

// Service under test
import { SkillServiceLiveLayer } from "../live.js"; // Import the layer providing the service
import { SkillService, SkillServiceTag } from "../types.js"; // Import interface and Tag
import type { SkillDefinition, SkillExecutionParams } from "../types.js"; // Import definition types
import { SkillConfigError } from "../errors.js"; // Import the specific error
import type { ParseError } from "effect/ParseResult"; // Import ParseError type

describe("SkillServiceLiveLayer", () => {
	// --- Test Helpers --- (Using the Layer.build pattern)
	const runTest = <E, A>(
		effect: Effect.Effect<A, E, SkillService>, // Effect requiring the service
	): Promise<A> => {
		const testLogic = Effect.flatMap(
			Layer.build(SkillServiceLiveLayer), // Build the SkillService layer
			(context: Context.Context<SkillService>) => Effect.provide(effect, context),
		);
		return Effect.runPromise(Effect.scoped(testLogic));
	};

	const runFailTest = <E, A>(
		effect: Effect.Effect<A, E, SkillService>, // Effect requiring the service
	): Promise<Exit.Exit<A, E>> => {
		const testLogic = Effect.flatMap(
			Layer.build(SkillServiceLiveLayer), // Build the SkillService layer
			(context: Context.Context<SkillService>) => Effect.provide(effect, context),
		);
		return Effect.runPromiseExit(Effect.scoped(testLogic));
	};

	// --- Test Data ---
	const validSkillInput: SkillDefinitionInput = {
		name: "test-skill-valid",
		description: "A valid skill",
		intelligenceName: "test-intel",
		// personaName: undefined, // Optional
		promptTemplateName: "test-prompt",
		// systemPromptOverride: undefined, // Optional
		// defaultParams: undefined, // Optional
		// inputSchemaRef: undefined, // Optional
		// outputSchemaRef: undefined, // Optional
		// metadata: undefined, // Optional
	};

	// --- Test Cases for make ---

	it("make should succeed with valid minimal definition", async () => {
		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			// Pass the valid input object
			return yield* service.make(validSkillInput);
		});

		const result = await runTest(testEffect);

		// Assert basic fields were passed through validation
		expect(result.name).toBe("test-skill-valid");
		expect(result.intelligenceName).toBe("test-intel");
		expect(result.promptTemplateName).toBe("test-prompt");
		expect(result.description).toBe("A valid skill");
	});

	it("make should succeed with valid definition including optional fields", async () => {
		const fullValidInput: SkillDefinitionInput = {
			...validSkillInput, // Start with minimal valid
			personaName: "test-persona",
			systemPromptOverride: "Override system prompt.",
			defaultParams: { temperature: 0.8, maxTokens: 500 },
			inputSchemaRef: "genericTextInput",
			outputSchemaRef: "stringOutput",
			metadata: { version: "1.0" }
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			return yield* service.make(fullValidInput);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-skill-valid");
		expect(result.personaName).toBe("test-persona");
		expect(result.systemPromptOverride).toBe("Override system prompt.");
		expect(result.defaultParams?.temperature).toBe(0.8);
		expect(result.defaultParams?.maxTokens).toBe(500);
		expect(result.inputSchemaRef).toBe("genericTextInput");
		expect(result.outputSchemaRef).toBe("stringOutput");
		expect(result.metadata?.version).toBe("1.0");
	});

	it("make should fail with SkillConfigError for invalid definition (missing required field 'name')", async () => {
		// Clone valid input and remove a required field
		const invalidInput = { ...validSkillInput };
		delete (invalidInput as any).name; // Remove required 'name'

		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			return yield* service.make(invalidInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(SkillConfigError);
			expect(value.message).toBe("Skill definition validation failed");
			expect(value.cause).toBeDefined();
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
				// Optionally check ParseError details for missing key 'name'
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	it("make should fail with SkillConfigError for invalid definition (wrong type for param)", async () => {
		const invalidInput = {
			...validSkillInput,
			defaultParams: { temperature: "hot" } // Invalid type for temperature
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			return yield* service.make(invalidInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(SkillConfigError);
			expect(value.message).toBe("Skill definition validation failed");
			expect(value.cause).toBeDefined();
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
				// Optionally check ParseError details for type mismatch on temperature
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	// --- Test Cases for update ---

	it("update should succeed with valid updates", async () => {
		// Start with a valid, validated definition object
		const currentData: SkillDefinition = {
			name: "test-update-skill",
			intelligenceName: "intel-v1",
			promptTemplateName: "prompt-v1",
			// Assume other fields are undefined initially
		};
		// Define updates using 'as const' for literal types if needed
		const updates = {
			description: "Updated description",
			personaName: "persona-updated",
			defaultParams: { temperature: 0.5 },
		} as const;

		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			return yield* service.update(currentData, updates);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-update-skill"); // Unchanged
		expect(result.description).toBe("Updated description"); // Updated
		expect(result.personaName).toBe("persona-updated"); // Added/Updated
		expect(result.defaultParams?.temperature).toBe(0.5); // Added/Updated
		expect(result.intelligenceName).toBe("intel-v1"); // Unchanged
	});

	it("update should fail with SkillConfigError if updates result in invalid state", async () => {
		const currentData: SkillDefinition = {
			name: "test-invalid-update-skill",
			intelligenceName: "intel-v1",
			promptTemplateName: "prompt-v1",
		};
		// Invalid update: setting required intelligenceName to null
		const invalidUpdates = {
			intelligenceName: null,
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* SkillServiceTag;
			// Use double assertion for intentionally invalid update structure
			return yield* service.update(
				currentData,
				invalidUpdates as unknown as Partial<SkillDefinitionInput>,
			);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(SkillConfigError);
			expect(value.message).toBe("Skill definition validation failed");
			expect(value.cause).toBeDefined();
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});
});
