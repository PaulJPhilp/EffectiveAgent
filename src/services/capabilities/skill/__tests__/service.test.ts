import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Cause, Effect, Exit, Layer, Option } from "effect";
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

const mockConfigService: ConfigurationService = {
	readConfig: (key: string) =>
		key === "skills"
			? Effect.succeed(JSON.stringify(validSkillConfig))
			: Effect.fail(new Error("Missing config")),
	readFile: () => Effect.fail(new Error("not implemented")),
	parseJson: () => Effect.fail(new Error("not implemented")),
	validateWithSchema: () => Effect.fail(new Error("not implemented")),
	loadConfig: () => Effect.fail(new Error("not implemented")),
};
const validConfigLayer = Layer.succeed(ConfigurationService, mockConfigService);

// --- Tests ---
describe("SkillService", () => {
	it("should load and validate skill config successfully", async () => {
		const effect = Effect.gen(function* () {
			const service = yield* SkillService;
			const config = yield* service.load();
			expect(config.skills).toHaveLength(1);
			expect(config.skills[0].name).toBe("test-skill");
			return config;
		});
		await Effect.runPromise(Effect.provide(effect, Layer.merge(SkillService.Default, validConfigLayer)));
	});

	it("should fail with SkillConfigError if config is invalid JSON", async () => {
		const mockInvalidConfigService: ConfigurationService = {
			readConfig: (key: string) =>
				key === "skills"
					? Effect.succeed("not a json")
					: Effect.fail(new Error("Missing config")),
			readFile: () => Effect.fail(new Error("not implemented")),
			parseJson: () => Effect.fail(new Error("not implemented")),
			validateWithSchema: () => Effect.fail(new Error("not implemented")),
			loadConfig: () => Effect.fail(new Error("not implemented")),
		};
		const invalidJsonLayer = Layer.succeed(ConfigurationService, mockInvalidConfigService);
		const testEffect = Effect.gen(function* () {
			const service = yield* SkillService;
			return yield* service.load();
		});
		const exit = await Effect.runPromise(Effect.exit(Effect.provide(testEffect, Layer.merge(SkillService.Default, invalidJsonLayer))));
		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) {
			expect.fail("Expected exit to be a failure");
			return;
		}
		const error = Cause.failureOption(exit.cause);
		expect(Option.isSome(error)).toBe(true);
		const value = Option.getOrThrow(error);
		expect(value).toBeInstanceOf(SkillConfigError);
		if (value instanceof SkillConfigError) {
			expect(value.description).toBe("Failed to parse skill configuration JSON");
		}
	});

	it("should fail with SkillConfigError if config fails schema validation", async () => {
		const mockInvalidSchemaService: ConfigurationService = {
			readConfig: (key: string) =>
				key === "skills"
					? Effect.succeed(JSON.stringify({ description: "Missing name and Skills" }))
					: Effect.fail(new Error("Missing config")),
			readFile: () => Effect.fail(new Error("not implemented")),
			parseJson: () => Effect.fail(new Error("not implemented")),
			validateWithSchema: () => Effect.fail(new Error("not implemented")),
			loadConfig: () => Effect.fail(new Error("not implemented")),
		};
		const invalidSchemaLayer = Layer.succeed(ConfigurationService, mockInvalidSchemaService);
		const testEffect = Effect.gen(function* () {
			const service = yield* SkillService;
			return yield* service.load();
		});
		const exit = await Effect.runPromise(Effect.exit(Effect.provide(testEffect, Layer.merge(SkillService.Default, invalidSchemaLayer))));
		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) {
			expect.fail("Expected exit to be a failure");
			return;
		}
		const error = Cause.failureOption(exit.cause);
		expect(Option.isSome(error)).toBe(true);
		const value = Option.getOrThrow(error);
		expect(value).toBeInstanceOf(SkillConfigError);
		if (value instanceof SkillConfigError) {
			expect(value.description).toBe("Failed to validate skill configuration");
		}
	});
});
