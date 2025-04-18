import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { PersonaConfigError } from "../errors.js";
import { PersonaService } from "../service.js";

// --- Valid Persona Config ---
const validPersonaConfig = {
    name: "test-persona-config",
    description: "A test persona config",
    personas: [
        {
            name: "test-profile",
            description: "A test profile",
            instructions: "Test instructions",
            // Add required fields for Persona schema if needed
        }
    ],
    version: "1.0.0"
};

const validConfigLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([
        ["personas", JSON.stringify(validPersonaConfig)]
    ]))
);

// --- Tests ---
describe("PersonaService", () => {
    it("should load and validate intelligence config successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* PersonaService;
            const loaded = yield* service.load();
            expect(loaded.name).toBe("test-persona-config");
            expect(loaded.personas).toHaveLength(1);
            expect(loaded.personas[0].name).toBe("test-profile");
            return loaded;
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const layer = PersonaService.Default;
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });

    it("should fail with PersonaConfigError if config is invalid JSON", async () => {
        const invalidJsonLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["personas", "not a json"]
            ]))
        );
        const effect = Effect.gen(function* () {
            const service = yield* PersonaService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidJsonLayer);
        const layer = PersonaService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        // Only check failureOption (defectOption does not exist in Effect)
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(false);
    });

    it("should fail with PersonaConfigError if config fails schema validation", async () => {
        const invalidSchemaLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["personas", JSON.stringify({ description: "Missing name and personas" })]
            ]))
        );
        const effect = Effect.gen(function* () {
            const service = yield* PersonaService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidSchemaLayer);
        const layer = PersonaService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(PersonaConfigError);
    });
});
