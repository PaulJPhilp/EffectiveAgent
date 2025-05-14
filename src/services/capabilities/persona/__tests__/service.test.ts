import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Cause, Effect, Exit, Layer, Option } from "effect";
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

const mockConfigService: ConfigurationService = {
    readConfig: (key: string) =>
        key === "personas"
            ? Effect.succeed(JSON.stringify(validPersonaConfig))
            : Effect.fail(new Error("Missing config")),
    readFile: () => Effect.fail(new Error("not implemented")),
    parseJson: () => Effect.fail(new Error("not implemented")),
    validateWithSchema: () => Effect.fail(new Error("not implemented")),
    loadConfig: () => Effect.fail(new Error("not implemented")),
};
const validConfigLayer = Layer.succeed(ConfigurationService, mockConfigService);

// --- Tests ---
describe("PersonaService", () => {
    it("should load and validate persona config successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* PersonaService;
            const config = yield* service.load();
            expect(config.name).toBe("test-persona-config");
            expect(config.personas).toHaveLength(1);
            expect(config.personas[0].name).toBe("test-profile");
            return config;
        });
        await Effect.runPromise(Effect.provide(effect, Layer.merge(PersonaService.Default, validConfigLayer)));
    });

    it("should fail with PersonaConfigError if config is invalid JSON", async () => {
        const mockInvalidConfigService: ConfigurationService = {
            readConfig: (key: string) =>
                key === "personas"
                    ? Effect.succeed("not a json")
                    : Effect.fail(new Error("Missing config")),
            readFile: () => Effect.fail(new Error("not implemented")),
            parseJson: () => Effect.fail(new Error("not implemented")),
            validateWithSchema: () => Effect.fail(new Error("not implemented")),
            loadConfig: () => Effect.fail(new Error("not implemented")),
        };
        const invalidJsonLayer = Layer.succeed(ConfigurationService, mockInvalidConfigService);
        const testEffect = Effect.gen(function* () {
            const service = yield* PersonaService;
            return yield* service.load();
        });
        const exit = await Effect.runPromise(Effect.exit(Effect.provide(testEffect, Layer.merge(PersonaService.Default, invalidJsonLayer))));
        expect(Exit.isFailure(exit)).toBe(true);
        if (!Exit.isFailure(exit)) {
            expect.fail("Expected exit to be a failure");
            return;
        }
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(PersonaConfigError);
        if (value instanceof PersonaConfigError) {
            expect(value.description).toBe("Failed to parse persona configuration JSON");
        }
    });

    it("should fail with PersonaConfigError if config fails schema validation", async () => {
        const mockInvalidSchemaService: ConfigurationService = {
            readConfig: (key: string) =>
                key === "personas"
                    ? Effect.succeed(JSON.stringify({ description: "Missing name and personas" }))
                    : Effect.fail(new Error("Missing config")),
            readFile: () => Effect.fail(new Error("not implemented")),
            parseJson: () => Effect.fail(new Error("not implemented")),
            validateWithSchema: () => Effect.fail(new Error("not implemented")),
            loadConfig: () => Effect.fail(new Error("not implemented")),
        };
        const invalidSchemaLayer = Layer.succeed(ConfigurationService, mockInvalidSchemaService);
        const testEffect = Effect.gen(function* () {
            const service = yield* PersonaService;
            return yield* service.load();
        });
        const exit = await Effect.runPromise(Effect.exit(Effect.provide(testEffect, Layer.merge(PersonaService.Default, invalidSchemaLayer))));
        expect(Exit.isFailure(exit)).toBe(true);
        if (!Exit.isFailure(exit)) {
            expect.fail("Expected exit to be a failure");
            return;
        }
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(PersonaConfigError);
        if (value instanceof PersonaConfigError) {
            expect(value.description).toBe("Failed to validate persona configuration");
        }
    });
});
