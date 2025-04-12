/**
 * @file Tests for the IntelligenceDataLiveLayer.
 * @module services/capabilities/intelligence/__tests__/data.test
 */

// Import Context along with other Effect modules
import { Cause, ConfigProvider, Context, Effect, Exit, HashMap, Layer, Option } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Service/Layer under test and related types/errors
import { IntelligenceConfigError } from "../errors.js";
import { IntelligenceDataLiveLayer } from "../data.js";
import { IntelligenceData, IntelligenceDataTag } from "../types.js";

// --- Test Setup ---

describe("IntelligenceDataLiveLayer", () => {
	let tempDir: string;
	let intelligencesJsonPath: string; // Declared here

	// Sample valid intelligence config content
	const validIntelligenceConfig = {
		intelligences: [
			{
				name: "test-intelligence-fast",
				description: "Fast and cheap",
				modelPreferences: [
					{ provider: "openai", model: "gpt-3.5-turbo", priority: 1 },
					{ provider: "groq", model: "llama3-8b", priority: 2 },
				],
				ragEnabled: false,
				memoryAccessLevel: "short_term",
				allowedTools: ["calculator"],
			},
			{
				name: "test-intelligence-smart",
				description: "Slower but smarter",
				modelPreferences: [
					{ provider: "openai", model: "gpt-4-turbo", priority: 1 },
					{ provider: "anthropic", model: "claude-3-opus", priority: 2 },
				],
				// ragEnabled, memoryAccessLevel, allowedTools are optional
			},
		],
	};

	beforeAll(async () => {
		tempDir = await fs.mkdtemp(path.join(tmpdir(), "test-intelligence-"));
		// Assign value here
		intelligencesJsonPath = path.join(tempDir, "intelligences.json");
		await fs.writeFile(
			intelligencesJsonPath,
			JSON.stringify(validIntelligenceConfig, null, 2),
		);
	});

	afterAll(async () => {
		if (tempDir) {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	});

	const runTest = <R, E, A>(
		effect: Effect.Effect<A, E, R>,
		testLayer: Layer.Layer<R, E, never>
	): Promise<A> => {
		const runnable = Effect.provide(effect, testLayer);
		return Effect.runPromise(runnable);
	};

	const runFailTest = <E, A>(
		effect: Effect.Effect<A, E, any>,
		testLayer: Layer.Layer<any, any, any>
	): Promise<Exit.Exit<A, E>> => {
		const runnable = Effect.provide(effect, testLayer);
		return Effect.runPromiseExit(runnable as Effect.Effect<A, E, never>);
	};

	const createConfigProviderLayer = (config: Record<string, string>) =>
		Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(config));

	// --- Test Cases ---

	it("should load and provide valid intelligence configuration", async () => {
		// Arrange: Read file content within an Effect
		const testEffect = Effect.gen(function* () {
			// Read file inside the Effect
			const fileContent = yield* Effect.tryPromise({
				try: () => fs.readFile(intelligencesJsonPath, "utf-8"),
				catch: (e) => new Error(`Test setup failed: ${e}`), // Fail test if reading fails
			});

			// Create the layer using the content
			const testLayer = Layer.provide(
				IntelligenceDataLiveLayer,
				createConfigProviderLayer({ intelligences: fileContent })
			);

			// Act: Access the data by yielding the Tag directly within provide
			const configData = yield* Effect.provide(
				IntelligenceDataTag, // Use the Tag directly as the Effect to resolve
				testLayer
			);

			// Assertions
			expect(configData).toBeInstanceOf(IntelligenceData);
			expect(HashMap.size(configData.intelligences)).toBe(2);
			const fastIntel = Option.getOrNull(
				HashMap.get(configData.intelligences, "test-intelligence-fast"),
			);
			expect(fastIntel?.description).toBe("Fast and cheap");
			expect(fastIntel?.ragEnabled).toBe(false);
			expect(fastIntel?.memoryAccessLevel).toBe("short_term");
			expect(fastIntel?.allowedTools).toEqual(["calculator"]);
			expect(fastIntel?.modelPreferences[0]?.provider).toBe("openai");
			expect(fastIntel?.modelPreferences[0]?.model).toBe("gpt-3.5-turbo");

			const smartIntel = Option.getOrNull(
				HashMap.get(configData.intelligences, "test-intelligence-smart"),
			);
			expect(smartIntel?.description).toBe("Slower but smarter");
			expect(smartIntel?.ragEnabled).toBeUndefined();
			expect(smartIntel?.modelPreferences[0]?.provider).toBe("openai");
			expect(smartIntel?.modelPreferences[0]?.model).toBe("gpt-4-turbo");
			// Return value if needed, otherwise Effect<void>
			return configData;
		});

		// Run the test effect providing an empty context layer
		await runTest(testEffect, Layer.succeedContext(Context.empty()));
	});

	it("should fail with IntelligenceConfigError if config source is missing", async () => {
		// Arrange
		const testLayer = Layer.provide(
			IntelligenceDataLiveLayer,
			createConfigProviderLayer({}) // Empty config
		);

		// Act: Define the effect as just the Tag
		const testEffect = IntelligenceDataTag; // Correct: Use the Tag directly

		// Run & Assert
		const result = await runFailTest(testEffect, testLayer); // Provide layer here
		Exit.match(result, {
			onFailure: (cause) => {
				const errorOpt = Cause.failureOption(cause);
				expect(Option.isSome(errorOpt)).toBe(true);
				const error = Option.getOrThrow(errorOpt); // Get the value
				expect(error).toBeInstanceOf(IntelligenceConfigError);
				// Assert type after instanceof check
				expect((error as IntelligenceConfigError).message).toBe(
					"Failed to load intelligences configuration source",
				);
			},
			onSuccess: () => { throw new Error("Expected failure but got success"); }
		});
	});

	it("should fail with IntelligenceConfigError if config source is not valid JSON", async () => {
		// Arrange
		const invalidJsonString = "{ \"intelligences\": [{ \"invalid\": true,";
		const testLayer = Layer.provide(
			IntelligenceDataLiveLayer,
			createConfigProviderLayer({ intelligences: invalidJsonString })
		);

		// Act
		const testEffect = IntelligenceDataTag;

		// Run & Assert
		const result = await runFailTest(testEffect, testLayer);
		
		Exit.match(result, {
			onFailure: (cause) => {
				const errorOpt = Cause.failureOption(cause);
				expect(Option.isSome(errorOpt)).toBe(true);

				if (Option.isSome(errorOpt)) {
					const error = Option.getOrThrow(errorOpt) as unknown;
					expect(error).toBeInstanceOf(IntelligenceConfigError);
					if (error instanceof IntelligenceConfigError) {
						expect(error.message).toContain(
							"Failed to parse intelligences configuration JSON"
						);
					}
				}
			},
			onSuccess: () => { throw new Error("Expected failure but got success"); }
		});
	});

	it("should fail with IntelligenceConfigError if config fails schema validation", async () => {
		// Arrange
		const invalidSchemaConfig = {
			intelligences: [{ description: "Invalid profile" }], // Missing required fields
		};
		const testLayer = Layer.provide(
			IntelligenceDataLiveLayer,
			createConfigProviderLayer({ intelligences: JSON.stringify(invalidSchemaConfig) })
		);

		// Act
		const testEffect = IntelligenceDataTag; // Correct: Use the Tag directly

		// Run & Assert
		const result = await runFailTest(testEffect, testLayer); // Provide layer here
		Exit.match(result, {
			onFailure: (cause) => {
				const errorOpt = Cause.failureOption(cause);
				expect(Option.isSome(errorOpt)).toBe(true);
				const error = Option.getOrThrow(errorOpt);
				expect(error).toBeInstanceOf(IntelligenceConfigError);
				// Assert type after instanceof check
				expect((error as IntelligenceConfigError).message).toBe(
					"Failed to validate intelligences configuration structure",
				);
			},
			onSuccess: () => { throw new Error("Expected failure but got success"); }
		});
	});
});
