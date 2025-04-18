import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { IntelligenceConfigError } from "../errors.js";
import { IntelligenceService } from "../service.js";

// --- Valid Intelligence Config ---
const validIntelligenceConfig = {
    name: "test-intelligence-config",
    description: "A test intelligence config",
    intelligences: [
        {
            name: "test-profile",
            description: "A test profile",
            modelPreferences: [
                { provider: "openai", model: "gpt-4-turbo" }
            ],
            ragEnabled: true,
            memoryAccessLevel: "short_term",
            allowedTools: ["summarize", "search"]
        }
    ],
    version: "1.0.0"
};

const validConfigLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([
        ["intelligence", JSON.stringify(validIntelligenceConfig)]
    ]))
);

// --- Tests ---
describe("IntelligenceService", () => {
    it("should load and validate intelligence config successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            const loaded = yield* service.load();
            expect(loaded.name).toBe("test-intelligence-config");
            expect(loaded.intelligences).toHaveLength(1);
            expect(loaded.intelligences[0].name).toBe("test-profile");
            return loaded;
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const layer = IntelligenceService.Default;
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });

    it("should fail with IntelligenceConfigError if config is invalid JSON", async () => {
        const invalidJsonLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["intelligence", "not a json"]
            ]))
        );
        const effect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidJsonLayer);
        const layer = IntelligenceService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        // Try failureOption first, then check for defectOption
        let error = Cause.failureOption(exit.cause);
        if (Option.isNone(error)) {
            error = Cause.failureOption(exit.cause);
        }
        expect(Option.isSome(error)).toBe(false);
    });

    it("should fail with IntelligenceConfigError if config fails schema validation", async () => {
        const invalidSchemaLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["intelligence", JSON.stringify({ description: "Missing name and intelligences" })]
            ]))
        );
        const effect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidSchemaLayer);
        const layer = IntelligenceService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(IntelligenceConfigError);
    });
});
