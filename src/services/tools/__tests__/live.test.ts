/**
 * @file Unit tests for the ToolExecutorService logic (live.ts).
 * @module services/tools/__tests__/live.test
 */

import { Cause, Effect, Exit, Layer, Option, Schema } from "effect";
import { describe, expect, it } from "vitest"; // Import vi for mocking

import {
	ToolExecutionError,
	ToolInputValidationError,
	ToolNotFoundError,
	ToolOutputValidationError,
} from "../errors.js";
// Logic/Service under test
import { ToolExecutorServiceLiveImplementationLogic } from "../live.js";
import {
	ToolExecutorService,
	ToolExecutorServiceTag,
	ToolRegistryDataTag
} from "../types.js";

import { CurrentExecutionPermissionsRef, type ExecutionPermissions } from "@/services/execution/context.js"; // Adjust path if needed
import { BunContext } from "@effect/platform-bun"; // Import real platform context
// Dependencies & Context
import { HttpClient } from "@effect/platform/HttpClient";
// Import test registry layer from mocks file
import { testRegistryLayer } from "./test.mocks.js"; // Import the registry layer and schema if needed

// --- Test Tools Definitions (Imported via testRegistryLayer, define schema locally for test type) ---
const httpGetOutputSchema = Schema.Struct({ userId: Schema.Number, id: Schema.Number, title: Schema.String, completed: Schema.Boolean });

// Build the final, self-contained layer used for all tests
const buildTestLayer: () => Layer.Layer<ToolExecutorService, never, never> = () =>
	Layer.effect(
		ToolExecutorServiceTag,
		Effect.gen(function* () {
			const registryData = yield* ToolRegistryDataTag;
			const httpClient = yield* HttpClient;
			return yield* ToolExecutorServiceLiveImplementationLogic({ registryData, httpClient });
		})
	).pipe(
		Layer.provide(Layer.merge(testRegistryLayer, BunContext.layer))
	);

// --- Layer that builds the Service Implementation ---
// This layer definition requires ToolRegistryDataTag and HttpClient in its R channel
const TestExecutorServiceLayerDefinition: Layer.Layer<ToolExecutorService, never, HttpClient> = Layer.effect(
	ToolExecutorServiceTag,
	Effect.gen(function* () {
		const registryData = yield* ToolRegistryDataTag;
		const httpClient = yield* HttpClient; // Will get real HttpClient from context
		return yield* ToolExecutorServiceLiveImplementationLogic({ registryData, httpClient });
	})
) as Layer.Layer<ToolExecutorService, never, never>;

const TestLayer = buildTestLayer();


// --- Test Helpers ---
// Helpers now provide the single, pre-built, self-contained TestLayer
const runTest = <E, A>(
	effect: Effect.Effect<A, E, ToolExecutorService>, // Effect requiring the executor
): Promise<A> => {
	const runnable = Effect.provide(effect, TestLayer); // Provide the complete layer
	// runnable should now be Effect<A, E, never>
	return Effect.runPromise(runnable as Effect.Effect<A, E, never>); // Assertion for E safety
};

const runFailTest = <E, A>(
	effect: Effect.Effect<A, E, ToolExecutorService>,
): Promise<Exit.Exit<A, E>> => {
	const runnable = Effect.provide(effect, TestLayer); // Provide the complete layer
	// runnable should now be Effect<A, E, never>
	return Effect.runPromiseExit(runnable as Effect.Effect<A, E, never>); // Assertion for E safety
};

// Helpers for permissions still use Effect.locally, then pass to the above helpers
const runTestWithPermissions = <E, A>(
	effect: Effect.Effect<A, E, ToolExecutorService>,
	permissions: ExecutionPermissions | undefined,
): Promise<A> => {
	const effectWithPermissions = Effect.locally(CurrentExecutionPermissionsRef, permissions)(effect);
	// runTest now provides the complete layer stack internally
	return runTest(effectWithPermissions);
};

const runFailTestWithPermissions = <E, A>(
	effect: Effect.Effect<A, E, ToolExecutorService>,
	permissions: ExecutionPermissions | undefined,
): Promise<Exit.Exit<A, E>> => {
	const effectWithPermissions = Effect.locally(CurrentExecutionPermissionsRef, permissions)(effect);
	// runFailTest now provides the complete layer stack internally
	return runFailTest(effectWithPermissions);
};

const needsHttp = Effect.service(HttpClient); // Use Service here
const provided = Effect.provide(needsHttp, BunContext.layer);

Effect.runPromise(provided).then(console.log).catch(console.error);



// --- Test Suite ---
describe("ToolExecutorService (live.ts)", () => {

	const defaultPermissions: ExecutionPermissions = {
		allowedTools: new Set(["adder", "http/getTodo", "badOutput"])
	};

	// --- Diagnostic Test ---
	// --- Diagnostic Test ---
	it("should provide HttpClient via BunContext.layer", async () => {
		// Define an effect that requires HttpClient
		const effectRequiringHttp = Effect.gen(function* () {
			const client = yield* HttpClient;
			expect(client).toBeDefined(); // Simple check
			// Optionally try a simple request:
			// const response = yield* client.pipe(HttpClientRequest.get("https://example.com"));
			// expect(response.status).toBe(200);
			return true;
		});

		// Create a layer that provides the effect's requirement
		const layerProvidingHttp = BunContext.layer;

		// Create a layer that runs the effect after providing its dependency
		const testLayer = Layer.provide(
			Layer.effectDiscard(effectRequiringHttp), // Run the effect, discard result
			layerProvidingHttp // Provide HttpClient
		);

		// Use Layer.build to get an Effect that builds and runs the layer's logic
		// Layer.build requires a Scope
		const runnableEffect = Effect.scoped(Layer.build(testLayer));

		// Run the final effect which should have R=never
		// This Effect<void, E, never> can be run by runPromise
		await expect(Effect.runPromise(runnableEffect)).resolves.toBeUndefined();
	});



	// --- Basic Execution Tests ---
	it("should execute a simple EffectImplementation tool", async () => {
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			const result = yield* executor.run<{ sum: number }>("adder", { a: 5, b: 3 });
			return result.sum;
		});
		// runTestWithPermissions internally provides the full layer now
		const sum = await runTestWithPermissions(testEffect, defaultPermissions);
		expect(sum).toBe(8);
	});

	// --- Input Validation Tests ---
	it("should fail with ToolInputValidationError for invalid input", async () => {
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			return yield* executor.run("adder", { a: 5, b: "three" });
		});
		// runFailTestWithPermissions internally provides the full layer now
		const exit = await runFailTestWithPermissions(testEffect, defaultPermissions);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errorOpt = Cause.failureOption(exit.cause);
			expect(Option.isSome(errorOpt)).toBe(true);
			const value = Option.getOrThrow(errorOpt); // value is unknown
			expect(value).toBeInstanceOf(ToolInputValidationError); // Narrow type
			// Corrected: Use type assertion AFTER instanceof check
			expect((value as ToolInputValidationError).toolName).toBe("adder");
			expect((value as ToolInputValidationError).cause).toBeDefined();
			const cause = (value as ToolInputValidationError).cause;
			// Corrected Assertion: Check cause._tag safely
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				// Fallback or fail if structure isn't as expected
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	// --- Output Validation Tests ---
	it("should fail with ToolOutputValidationError for invalid output", async () => {
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			return yield* executor.run<{ value: string }>("badOutput", {});
		});
		const exit = await runFailTestWithPermissions(testEffect, defaultPermissions);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errorOpt = Cause.failureOption(exit.cause);
			expect(Option.isSome(errorOpt)).toBe(true);
			const value = Option.getOrThrow(errorOpt); // value is unknown
			expect(value).toBeInstanceOf(ToolOutputValidationError); // Narrow type
			// Corrected: Use type assertion AFTER instanceof check
			expect((value as ToolOutputValidationError).toolName).toBe("badOutput");
			expect((value as ToolOutputValidationError).cause).toBeDefined();
			const cause = (value as ToolOutputValidationError).cause;
			// Corrected Assertion: Check cause._tag safely
			if (cause && typeof cause === 'object' && '_tag' in cause) {
				expect(cause._tag).toBe("ParseError");
			} else {
				expect(cause).toHaveProperty('_tag', 'ParseError');
			}
		}
	});

	// --- Tool Not Found Tests ---
	it("should fail with ToolNotFoundError for unknown tool", async () => {
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			return yield* executor.run("nonExistentTool", {});
		});
		const exit = await runFailTestWithPermissions(testEffect, defaultPermissions);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errorOpt = Cause.failureOption(exit.cause);
			expect(Option.isSome(errorOpt)).toBe(true);
			const value = Option.getOrThrow(errorOpt); // value is unknown
			expect(value).toBeInstanceOf(ToolNotFoundError); // Narrow type
			// Corrected: Use type assertion AFTER instanceof check
			expect((value as ToolNotFoundError).toolName).toBe("nonExistentTool");
		}
	});

	// --- Permission Tests ---
	it("should fail with ToolExecutionError (Permission Denied) if tool not allowed", async () => {
		const permissions: ExecutionPermissions = { allowedTools: new Set(["adder"]) };
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			return yield* executor.run("http/getTodo", { id: 1 });
		});
		const exit = await runFailTestWithPermissions(testEffect, permissions);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errorOpt = Cause.failureOption(exit.cause);
			expect(Option.isSome(errorOpt)).toBe(true);
			const value = Option.getOrThrow(errorOpt); // value is unknown
			expect(value).toBeInstanceOf(ToolExecutionError); // Narrow type
			// Corrected: Use type assertion AFTER instanceof check
			expect((value as ToolExecutionError).toolName).toBe("http/getTodo");
			expect((value as ToolExecutionError).cause).toContain("Permission denied");
		}
	});

	it("should fail with ToolExecutionError (Permission Denied) if allowedTools is undefined in context", async () => {
		const permissions = undefined;
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			return yield* executor.run("adder", { a: 1, b: 1 });
		});
		const exit = await runFailTestWithPermissions(testEffect, permissions);

		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			const errorOpt = Cause.failureOption(exit.cause);
			expect(Option.isSome(errorOpt)).toBe(true);
			const value = Option.getOrThrow(errorOpt); // value is unknown
			expect(value).toBeInstanceOf(ToolExecutionError); // Narrow type
			// Corrected: Use type assertion AFTER instanceof check
			expect((value as ToolExecutionError).toolName).toBe("adder");
			expect((value as ToolExecutionError).cause).toContain("No tools allowed");
		}
	});

	// --- HTTP Implementation Tests ---
	// This test now performs a REAL network call to jsonplaceholder
	it("should execute a simple HttpImplementation tool (REAL NETWORK CALL)", async () => {
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			// Corrected: Use Schema.Schema.Type<typeof ...> for the generic
			const result = yield* executor.run<Schema.Schema.Type<typeof httpGetOutputSchema>>(
				"http/getTodo",
				{ id: 1 } // Use ID 1 which exists on jsonplaceholder
			);
			return result;
		});
		// Run test (no override layer needed)
		const todo = await runTestWithPermissions(testEffect, defaultPermissions);
		// Assertions against real data
		expect(todo.userId).toBe(1);
		expect(todo.id).toBe(1);
		expect(todo.title).toBeDefined(); // Real title varies
		expect(typeof todo.completed).toBe('boolean'); // Real completed varies
	});

	// This test is harder to reliably trigger specific HTTP errors without mocking
	it.skip("should handle HTTP errors during HttpImplementation execution", async () => {
		// Skipping this as it requires more complex network mocking or setup
		const testEffect = Effect.gen(function* () {
			const executor = yield* ToolExecutorServiceTag;
			// Example: Use an ID known to not exist or cause schema failure
			return yield* executor.run("http/getTodo", { id: 999999 });
		});
		const exit = await runFailTestWithPermissions(testEffect, defaultPermissions);
		// Assertions would check for ToolExecutionError wrapping HttpClientError/PlatformError/ParseError
		expect(Exit.isFailure(exit)).toBe(true);
	});

}); // End describe block
