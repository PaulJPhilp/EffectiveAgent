/**
 * @file Unit tests for the PersonaServiceLiveLayer.
 * @module services/capabilities/persona/__tests__/live.test
 */

import { Effect, Exit, Layer, Scope, Cause, Option, Context } from "effect";
import { describe, it, expect } from "vitest";

// Service under test
import { PersonaServiceLiveLayer } from "../live.js";
import { PersonaService, PersonaServiceTag } from "../types.js";
import type { PersonaDefinition } from "../types.js"; // Import the type
import { PersonaConfigError } from "../errors.js";
// Correct import for ParseError
import type { ParseError } from "effect/ParseResult";

describe("PersonaServiceLiveLayer", () => {
	// --- Test Helpers --- (Identical to Intelligence tests)
	const runTest = <E, A>(
		effect: Effect.Effect<A, E, PersonaService>, // Requires PersonaService
	): Promise<A> => {
		const testLogic = Effect.flatMap(
			Layer.build(PersonaServiceLiveLayer), // Build the Persona layer
			(context: Context.Context<PersonaService>) => Effect.provide(effect, context),
		);
		return Effect.runPromise(Effect.scoped(testLogic));
	};

	const runFailTest = <E, A>(
		effect: Effect.Effect<A, E, PersonaService>, // Requires PersonaService
	): Promise<Exit.Exit<A, E>> => {
		const testLogic = Effect.flatMap(
			Layer.build(PersonaServiceLiveLayer), // Build the Persona layer
			(context: Context.Context<PersonaService>) => Effect.provide(effect, context),
		);
		return Effect.runPromiseExit(Effect.scoped(testLogic));
	};

	// --- Test Cases for make ---

	it("make should succeed with valid definition", async () => {
		const validDefinitionInput = {
			name: "test-valid-persona",
			description: "Valid persona definition",
			instructions: "Be polite and helpful.", // Required field
			tone: "professional", // Optional but valid
			// Other optional fields omitted
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* PersonaServiceTag;
			return yield* service.make(validDefinitionInput);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-valid-persona");
		expect(result.instructions).toBe("Be polite and helpful.");
		expect(result.tone).toBe("professional");
		expect(result.verbosity).toBeUndefined(); // Check optional field absence
	});

	it("make should fail with PersonaConfigError for invalid definition (missing required field)", async () => {
		const invalidDefinitionInput = {
			name: "test-invalid-persona",
			// instructions: "...", // Missing required 'instructions'
			description: "Invalid definition",
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* PersonaServiceTag;
			return yield* service.make(invalidDefinitionInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(PersonaConfigError);
			expect(value.message).toBe("Persona validation failed");
			expect(value.cause).toBeDefined();
			const cause = value.cause;
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	it("make should fail with PersonaConfigError for invalid definition (wrong enum value)", async () => {
		const invalidDefinitionInput = {
			name: "test-invalid-enum",
			instructions: "Be helpful.",
			tone: "sarcastic", // Invalid enum value for tone
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* PersonaServiceTag;
			return yield* service.make(invalidDefinitionInput);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(PersonaConfigError);
			expect(value.message).toBe("Persona validation failed");
			expect(value.cause).toBeDefined();
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
		const currentData: PersonaDefinition = {
			name: "test-update-persona",
			instructions: "Initial instructions.",
			tone: "formal",
		};
		// Use 'as const' to preserve literal types for tone and verbosity
		const updates = {
			description: "Updated description",
			tone: "casual", // Literal type preserved
			verbosity: "concise", // Literal type preserved
		} as const; // Add 'as const' here

		const testEffect = Effect.gen(function* () {
			const service = yield* PersonaServiceTag;
			// Pass the correctly typed updates object
			return yield* service.update(currentData, updates);
		});

		const result = await runTest(testEffect);

		expect(result.name).toBe("test-update-persona"); // Unchanged
		expect(result.description).toBe("Updated description"); // Added/Updated
		expect(result.instructions).toBe("Initial instructions."); // Unchanged
		expect(result.tone).toBe("casual"); // Updated
		expect(result.verbosity).toBe("concise"); // Added/Updated
	});

	it("update should fail with PersonaConfigError if updates result in invalid state", async () => {
		const currentData: PersonaDefinition = {
			name: "test-invalid-update-persona",
			instructions: "Initial instructions.",
		};
		// Invalid update: setting instructions to null (invalid type for required field)
		const invalidUpdates = {
			instructions: null,
		};

		const testEffect = Effect.gen(function* () {
			const service = yield* PersonaServiceTag;
			// Keep the type assertion, acknowledging the TS warning (TS2352) is acceptable here
			return yield* service.update(
				currentData,
				(invalidUpdates as unknown) as Partial<PersonaDefinition>,
			);
		});

		const exit = await runFailTest(testEffect);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(PersonaConfigError);
			expect(value.message).toBe("Persona validation failed");
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
