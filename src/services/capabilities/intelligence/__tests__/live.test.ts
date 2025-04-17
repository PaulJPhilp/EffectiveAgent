/**
 * @file Unit tests for the IntelligenceServiceLiveLayer.
 * @module services/capabilities/intelligence/__tests__/live.test
 */

import { Effect, Exit, Layer, Scope, Cause, Option, Context } from "effect";
import { describe, it, expect } from "vitest";

// Service under test
import { IntelligenceServiceLiveLayer } from "../service.js";
import { IntelligenceService, IntelligenceServiceTag } from "../types.js";
import type { IntelligenceDefinition } from "../types.js";
import { IntelligenceConfigError } from "../errors.js";
// Correct import for ParseError
import type { ParseError } from "effect/ParseResult";

describe("IntelligenceServiceLiveLayer", () => {
	// --- Test Helpers --- (Keep as before)
	const runTest = <E, A>(
		effect: Effect.Effect<A, E, IntelligenceService>,
	): Promise<A> => {
		const testLogic = Effect.flatMap(
			Layer.build(IntelligenceServiceLiveLayer),
			(context: Context.Context<IntelligenceService>) => Effect.provide(effect, context),
		);
		return Effect.runPromise(Effect.scoped(testLogic));
	};

	const runFailTest = <E, A>(
		effect: Effect.Effect<A, E, IntelligenceService>,
	): Promise<Exit.Exit<A, E>> => {
		const testLogic = Effect.flatMap(
			Layer.build(IntelligenceServiceLiveLayer),
			(context: Context.Context<IntelligenceService>) => Effect.provide(effect, context),
		);
		return Effect.runPromiseExit(Effect.scoped(testLogic));
	};

	// --- Test Cases for make ---

	it("make should succeed with valid definition", async () => {
		const validDefinitionInput = {
			name: "test-valid",
			description: "Valid definition",
			// Removed 'instructions' - not in schema
			modelPreferences: [
				{ provider: "openai", model: "gpt-4" },
			],
			ragEnabled: true, // Example optional field
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* IntelligenceServiceTag;
			return yield* service.make(validDefinitionInput);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-valid");
		// Removed assertion for 'instructions'
		expect(result.modelPreferences).toHaveLength(1);
		expect(result.modelPreferences[0].provider).toBe("openai");
		expect(result.ragEnabled).toBe(true);
	});

	it("make should fail with IntelligenceConfigError for invalid definition (missing required field)", async () => {
		const invalidDefinitionInput = {
			// name: "test-invalid", // Missing required 'name'
			description: "Invalid definition",
			// Removed 'instructions'
			modelPreferences: [{ provider: "openai", model: "gpt-4" }],
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* IntelligenceServiceTag;
			return yield* service.make(invalidDefinitionInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(IntelligenceConfigError);
			expect(value.message).toBe("Intelligence validation failed");
			expect(value.cause).toBeDefined();
			// Check cause is ParseError before accessing _tag
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				// Fail test if cause is not structured as expected
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	it("make should fail with IntelligenceConfigError for invalid definition (wrong type)", async () => {
		const invalidDefinitionInput = {
			name: "test-invalid-type",
			description: "Invalid definition",
			// Removed 'instructions'
			modelPreferences: [{ provider: "openai", model: "gpt-4" }],
			ragEnabled: "yes", // Invalid type
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* IntelligenceServiceTag;
			return yield* service.make(invalidDefinitionInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(IntelligenceConfigError);
			expect(value.message).toBe("Intelligence validation failed");
			expect(value.cause).toBeDefined();
			// Check cause is ParseError before accessing _tag
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	// --- Test Cases for update ---

	it("update should succeed with valid updates", async () => {
		const currentData: IntelligenceDefinition = {
			name: "test-update",
			description: "Initial",
			// Removed 'instructions'
			modelPreferences: [{ provider: "openai", model: "gpt-3.5-turbo" }],
		};
		const updates = {
			description: "Updated description",
			ragEnabled: true,
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* IntelligenceServiceTag;
			return yield* service.update(currentData, updates);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-update");
		expect(result.description).toBe("Updated description");
		expect(result.ragEnabled).toBe(true);
		// Removed assertion for 'instructions'
		expect(result.modelPreferences[0].model).toBe("gpt-3.5-turbo");
	});

	it("update should fail with IntelligenceConfigError if updates result in invalid state", async () => {
		const currentData: IntelligenceDefinition = {
			name: "test-invalid-update",
			description: "Initial",
			// Removed 'instructions'
			modelPreferences: [{ provider: "openai", model: "gpt-4" }],
		};
		const invalidUpdates = {
			name: 123, // Invalid type
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* IntelligenceServiceTag;
			// Keep assertion for test setup, warning is acceptable here
			return yield* service.update(
				currentData,
				(invalidUpdates as unknown) as Partial<IntelligenceDefinition>,
			);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(IntelligenceConfigError);
			expect(value.message).toBe("Intelligence validation failed");
			expect(value.cause).toBeDefined();
			// Check cause is ParseError before accessing _tag
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});
});
