import fs from "fs";
import path from "path";
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

	it("should load and validate skill config successfully", async () => {
		const effect = Effect.gen(function* () {
			const service = yield* SkillService;
			const loaded = yield* service.load();
			expect(loaded.skills).toHaveLength(1);
			expect(loaded.skills[0].name).toBe("test-skill");
			return loaded;
		});
		const runnable = Effect.provide(effect, validConfigLayer);
		const layer = SkillService.Default;
		const provided = Effect.provide(runnable, layer);
		await Effect.runPromise(provided);
	});

	it("should fail with SkillConfigError if config is invalid JSON", async () => {
		const invalidJsonLayer = Layer.succeed(
			ConfigProvider.ConfigProvider,
			ConfigProvider.fromMap(new Map([
				["skills", "not a json"]
			]))
		);
		const effect = Effect.gen(function* () {
			const service = yield* SkillService;
			return yield* service.load();
		});
		const runnable = Effect.provide(effect, invalidJsonLayer);
		const layer = SkillService.Default;
		const provided = Effect.provide(runnable, layer);
		const exit = await Effect.runPromise(Effect.exit(provided));
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
		const error = Cause.failureOption(exit.cause);
		expect(Option.isSome(error)).toBe(false);
	});

	it("should fail with SkillConfigError if config fails schema validation", async () => {
		const invalidSchemaLayer = Layer.succeed(
			ConfigProvider.ConfigProvider,
			ConfigProvider.fromMap(new Map([
				["skills", JSON.stringify({ description: "Missing name and Skills" })]
			]))
		);
		const effect = Effect.gen(function* () {
			const service = yield* SkillService;
			return yield* service.load();
		});
		const runnable = Effect.provide(effect, invalidSchemaLayer);
		const layer = SkillService.Default;
		const provided = Effect.provide(runnable, layer);
		const exit = await Effect.runPromise(Effect.exit(provided));
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
		const error = Cause.failureOption(exit.cause);
		expect(Option.isSome(error)).toBe(true);
		const value = Option.getOrThrow(error);
		expect(value).toBeInstanceOf(SkillConfigError);
	});
});
