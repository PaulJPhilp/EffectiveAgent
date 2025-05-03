import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { SkillConfigError } from "../errors.js";
import { SkillService } from "../service.js";

// --- Valid Skill Config ---
const validSkillConfig = {
	skills: [
		{
			name: "test-skill",
			description: "A test skill",
			intelligenceName: "test-intelligence",
			personaName: "test-persona",
			promptTemplateName: "test-template",
			systemPromptOverride: "Test system prompt override",
			defaultParams: {
				temperature: 0.7,
				maxTokens: 256
			},
			inputSchemaRef: "input-schema",
			outputSchemaRef: "output-schema",
			metadata: {}
		}
	]
};

const validConfigLayer = Layer.succeed(
	ConfigProvider.ConfigProvider,
	ConfigProvider.fromMap(new Map([
		["skills", JSON.stringify(validSkillConfig)]
	]))
);

// --- Tests ---
describe("SkillService", () => {
	it("should load and validate skill config successfully", () => 
		Effect.gen(function* () {
			// Setup test environment with valid config
			const configLayer = Layer.succeed(
				ConfigProvider.ConfigProvider,
				ConfigProvider.fromMap(new Map([
					["skills", JSON.stringify(validSkillConfig)]
				]))
			);
			
			// Access the service and provide the environment
			const effect = Effect.gen(function* () {
				const service = yield* SkillService;
				const config = yield* service.load();
				
				// Assertions
				expect(config.skills).toHaveLength(1);
				expect(config.skills[0].name).toBe("test-skill");
				
				return config;
			});
			
			return yield* Effect.provide(
				effect,
				Layer.merge(SkillService.Default, configLayer)
			);
		})
	);

	it("should fail with SkillConfigError if config is invalid JSON", () =>
		Effect.gen(function* () {
			// Setup test environment with invalid JSON
			const invalidJsonLayer = Layer.succeed(
				ConfigProvider.ConfigProvider,
				ConfigProvider.fromMap(new Map([
					["skills", "not a json"]
				]))
			);
			
			// Create an effect that should fail
			const testEffect = Effect.gen(function* () {
				const service = yield* SkillService;
				return yield* service.load();
			});
			
			// Run with Exit to capture the failure
			const exit = yield* Effect.provide(
				Effect.exit(testEffect),
				Layer.merge(SkillService.Default, invalidJsonLayer)
			);
			
			// Assertions - verify failure without throw
			expect(Exit.isFailure(exit)).toBe(true);
			
			// Use type guard to narrow the type before accessing cause
			if (!Exit.isFailure(exit)) {
				// This should never happen because we already verified it's a failure
				// But we need this for TypeScript type narrowing
				expect.fail("Expected exit to be a failure");
				return;
			}
			
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(SkillConfigError);
			
			// Type check before accessing properties
			if (value instanceof SkillConfigError) {
				expect(value.description).toBe("Failed to parse skill configuration JSON");
			}
		})
	);

	it("should fail with SkillConfigError if config fails schema validation", () =>
		Effect.gen(function* () {
			// Setup test environment with schema-invalid config
			const invalidSchemaLayer = Layer.succeed(
				ConfigProvider.ConfigProvider,
				ConfigProvider.fromMap(new Map([
					["skills", JSON.stringify({ description: "Missing name and Skills" })]
				]))
			);
			
			// Create an effect that should fail
			const testEffect = Effect.gen(function* () {
				const service = yield* SkillService;
				return yield* service.load();
			});
			
			// Run with Exit to capture the failure 
			const exit = yield* Effect.provide(
				Effect.exit(testEffect),
				Layer.merge(SkillService.Default, invalidSchemaLayer)
			);
			
			// Assertions - verify failure without throw
			expect(Exit.isFailure(exit)).toBe(true);
			
			// Use type guard to narrow the type before accessing cause
			if (!Exit.isFailure(exit)) {
				// This should never happen because we already verified it's a failure
				// But we need this for TypeScript type narrowing
				expect.fail("Expected exit to be a failure");
				return;
			}
			
			const error = Cause.failureOption(exit.cause);
			expect(Option.isSome(error)).toBe(true);
			
			const value = Option.getOrThrow(error);
			expect(value).toBeInstanceOf(SkillConfigError);
			
			// Type check before accessing properties
			if (value instanceof SkillConfigError) {
				expect(value.description).toBe("Failed to validate skill configuration");
			}
		})
	);
});
