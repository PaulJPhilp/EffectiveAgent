import { ConfigParseError, ConfigReadError, ConfigValidationError } from "@/services/core/configuration/errors.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Cause, Effect, Exit, Layer, Option } from "effect";
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

const mockConfigService: ConfigurationService = {
    _tag: "ConfigurationService",
    loadConfig: <T>() =>
        Effect.succeed(validIntelligenceConfig as T),
    readFile: () => Effect.fail(new ConfigReadError({ filePath: "not implemented" })),
    parseJson: () => Effect.fail(new ConfigParseError({ filePath: "not implemented" })),
    validateWithSchema: () => Effect.fail(new ConfigValidationError({ filePath: "not implemented", validationError: {} as any })),
};
const validConfigLayer = Layer.succeed(ConfigurationService, mockConfigService);

// --- Tests ---
describe("IntelligenceService", () => {
    it("should load and validate intelligence config successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            const config = yield* service.load();
            expect(config?.name).toBe("test-intelligence-config");
            expect(config?.intelligences).toHaveLength(1);
            expect(config?.intelligences[0]?.name).toBe("test-profile");
            return config;
        });
        await Effect.runPromise(Effect.provide(effect, Layer.merge(IntelligenceService.Default, validConfigLayer)) as Effect.Effect<any, unknown, never>);
    });

    it("should fail with IntelligenceConfigError if config is invalid JSON", async () => {
        const mockInvalidConfigService: ConfigurationService = {
            _tag: "ConfigurationService",
            loadConfig: <T>() =>
                Effect.succeed("not a json" as T),
            readFile: () => Effect.fail(new ConfigReadError({ filePath: "not implemented" })),
            parseJson: () => Effect.fail(new ConfigParseError({ filePath: "not implemented" })),
            validateWithSchema: () => Effect.fail(new ConfigValidationError({ filePath: "not implemented", validationError: {} as any })),
        };
        const invalidJsonLayer = Layer.succeed(ConfigurationService, mockInvalidConfigService);
        const testEffect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            return yield* service.load();
        });

        const exit = await Effect.runPromise(
            // @ts-expect-error
            Effect.exit(Effect.provide(testEffect, Layer.merge(IntelligenceService.Default, invalidJsonLayer)))
        ) as unknown as import("effect/Exit").Exit<unknown, unknown>;
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
            throw new Error("Expected failure but got success");
        }
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(IntelligenceConfigError);
        if (value instanceof IntelligenceConfigError) {
            expect(value.description).toBe("Failed to parse intelligence configuration JSON")
        } else if (typeof value === "object" && value !== null && "constructor" in value) {
            throw new Error(`Expected IntelligenceConfigError but got ${(value as { constructor: { name: string } }).constructor.name}`)
        } else {
            throw new Error("Expected IntelligenceConfigError but got unknown error type")
        }
    })

    it("should fail with IntelligenceConfigError if config fails schema validation", async () => {
        const mockInvalidSchemaService: ConfigurationService = {
            _tag: "ConfigurationService",
            loadConfig: <T>() =>
                Effect.succeed({ description: "Missing name and intelligences" } as T),
            readFile: () => Effect.fail(new ConfigReadError({ filePath: "not implemented" })),
            parseJson: () => Effect.fail(new ConfigParseError({ filePath: "not implemented" })),
            validateWithSchema: () => Effect.fail(new ConfigValidationError({ filePath: "not implemented", validationError: {} as any })),
        };
        const invalidSchemaLayer = Layer.succeed(ConfigurationService, mockInvalidSchemaService);
        const testEffect = Effect.gen(function* () {
            const service = yield* IntelligenceService;
            return yield* service.load();
        });
        const exit = await Effect.runPromise(
            // @ts-expect-error
            Effect.exit(Effect.provide(testEffect, Layer.merge(IntelligenceService.Default, invalidSchemaLayer)))
        ) as unknown as import("effect/Exit").Exit<unknown, unknown>;
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
            throw new Error("Expected failure but got success");
        }
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(IntelligenceConfigError);
        if (value instanceof IntelligenceConfigError) {
            expect(value.description).toBe("Failed to validate intelligence configuration");
        } else if (typeof value === "object" && value !== null && "constructor" in value) {
            throw new Error(`Expected IntelligenceConfigError but got ${(value as { constructor: { name: string } }).constructor.name}`);
        } else {
            throw new Error("Expected IntelligenceConfigError but got unknown error type");
        }
    });
});
