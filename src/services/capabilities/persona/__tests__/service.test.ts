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
    it("should load and validate persona config successfully", () => 
        Effect.gen(function* () {
            // Setup test environment with valid config
            const configLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["personas", JSON.stringify(validPersonaConfig)]
                ]))
            );
            
            // Access the service and provide the environment
            const effect = Effect.gen(function* () {
                const service = yield* PersonaService;
                const config = yield* service.load();
                
                // Assertions
                expect(config.name).toBe("test-persona-config");
                expect(config.personas).toHaveLength(1);
                expect(config.personas[0].name).toBe("test-profile");
                
                return config;
            });
            
            return yield* Effect.provide(
                effect,
                Layer.merge(PersonaService.Default, configLayer)
            );
        })
    );

    it("should fail with PersonaConfigError if config is invalid JSON", () =>
        Effect.gen(function* () {
            // Setup test environment with invalid JSON
            const invalidJsonLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["personas", "not a json"]
                ]))
            );
            
            // Create an effect that should fail
            const testEffect = Effect.gen(function* () {
                const service = yield* PersonaService;
                return yield* service.load();
            });
            
            // Run with Exit to capture the failure
            const exit = yield* Effect.provide(
                Effect.exit(testEffect),
                Layer.merge(PersonaService.Default, invalidJsonLayer)
            );
            
            // Assertions - verify failure without throw
            expect(Exit.isFailure(exit)).toBe(true);
            
            const error = Cause.failureOption(exit.cause);
            expect(Option.isSome(error)).toBe(true);
            
            const value = Option.getOrThrow(error);
            expect(value).toBeInstanceOf(PersonaConfigError);
            
            // Type check before accessing properties
            if (value instanceof PersonaConfigError) {
                expect(value.description).toBe("Failed to parse persona configuration JSON");
            }
        })
    );

    it("should fail with PersonaConfigError if config fails schema validation", () =>
        Effect.gen(function* () {
            // Setup test environment with schema-invalid config
            const invalidSchemaLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["personas", JSON.stringify({ description: "Missing name and personas" })]
                ]))
            );
            
            // Create an effect that should fail
            const testEffect = Effect.gen(function* () {
                const service = yield* PersonaService;
                return yield* service.load();
            });
            
            // Run with Exit to capture the failure 
            const exit = yield* Effect.provide(
                Effect.exit(testEffect),
                Layer.merge(PersonaService.Default, invalidSchemaLayer)
            );
            
            // Assertions - verify failure without throw
            expect(Exit.isFailure(exit)).toBe(true);
            
            const error = Cause.failureOption(exit.cause);
            expect(Option.isSome(error)).toBe(true);
            
            const value = Option.getOrThrow(error);
            expect(value).toBeInstanceOf(PersonaConfigError);
            
            // Type check before accessing properties
            if (value instanceof PersonaConfigError) {
                expect(value.description).toBe("Failed to validate persona configuration");
            }
        })
    );
});
