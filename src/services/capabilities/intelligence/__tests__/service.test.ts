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
    it("should load and validate intelligence config successfully", () => 
        Effect.gen(function* () {
            // Setup test environment with valid config
            const configLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["intelligence", JSON.stringify(validIntelligenceConfig)]
                ]))
            );
            
            // Access the service and provide the environment
            const effect = Effect.gen(function* () {
                const service = yield* IntelligenceService;
                const config = yield* service.load();
                
                // Assertions
                expect(config.name).toBe("test-intelligence-config");
                expect(config.intelligences).toHaveLength(1);
                expect(config.intelligences[0].name).toBe("test-profile");
                
                return config;
            });
            
            return yield* Effect.provide(
                effect,
                Layer.merge(IntelligenceService.Default, configLayer)
            );
        })
    );

    it("should fail with IntelligenceConfigError if config is invalid JSON", () =>
        Effect.gen(function* () {
            // Setup test environment with invalid JSON
            const invalidJsonLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["intelligence", "not a json"]
                ]))
            );
            
            // Create an effect that should fail
            const testEffect = Effect.gen(function* () {
                const service = yield* IntelligenceService;
                return yield* service.load();
            });
            
            // Run with Exit to capture the failure
            const exit = yield* Effect.provide(
                Effect.exit(testEffect),
                Layer.merge(IntelligenceService.Default, invalidJsonLayer)
            );
            
            // Assertions
            expect(Exit.isFailure(exit)).toBe(true);
            
            if (Exit.isSuccess(exit)) {
                throw new Error("Expected failure but got success");
            }
            
            const error = Cause.failureOption(exit.cause);
            expect(Option.isSome(error)).toBe(true);
            
            const value = Option.getOrThrow(error);
            expect(value).toBeInstanceOf(IntelligenceConfigError);
            
            // Type check before accessing properties
            if (value instanceof IntelligenceConfigError) {
                expect(value.description).toBe("Failed to parse intelligence configuration JSON");
            } else {
                throw new Error(`Expected IntelligenceConfigError but got ${value.constructor.name}`);
            }
        })
    );

    it("should fail with IntelligenceConfigError if config fails schema validation", () =>
        Effect.gen(function* () {
            // Setup test environment with schema-invalid config
            const invalidSchemaLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["intelligence", JSON.stringify({ description: "Missing name and intelligences" })]
                ]))
            );
            
            // Create an effect that should fail
            const testEffect = Effect.gen(function* () {
                const service = yield* IntelligenceService;
                return yield* service.load();
            });
            
            // Run with Exit to capture the failure
            const exit = yield* Effect.provide(
                Effect.exit(testEffect),
                Layer.merge(IntelligenceService.Default, invalidSchemaLayer)
            );
            
            // Assertions
            expect(Exit.isFailure(exit)).toBe(true);
            
            if (Exit.isSuccess(exit)) {
                throw new Error("Expected failure but got success");
            }
            
            const error = Cause.failureOption(exit.cause);
            expect(Option.isSome(error)).toBe(true);
            
            const value = Option.getOrThrow(error);
            expect(value).toBeInstanceOf(IntelligenceConfigError);
            
            // Type check before accessing properties
            if (value instanceof IntelligenceConfigError) {
                expect(value.description).toBe("Failed to validate intelligence configuration");
            } else {
                throw new Error(`Expected IntelligenceConfigError but got ${value.constructor.name}`);
            }
        })
    );
});
