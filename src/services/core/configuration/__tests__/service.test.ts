import { Effect, Schema, Either, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { ConfigurationService } from "../service.js";
import { ConfigReadError, ConfigParseError, ConfigValidationError } from "../errors.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from "fs";

describe("ConfigurationService", () => {
    const TestSchema = Schema.Struct({
        name: Schema.String,
        value: Schema.Number
    });

    const testDir = join(process.cwd(), "test-configs");
    const validConfig = join(testDir, "valid.json");
    const invalidConfig = join(testDir, "invalid.json");
    const malformedConfig = join(testDir, "malformed.json");

    beforeEach(() => {
        // Create test directory and files
        mkdirSync(testDir, { recursive: true });
        writeFileSync(validConfig, JSON.stringify({ name: "test", value: 123 }));
        writeFileSync(invalidConfig, JSON.stringify({ name: "test" }));
        writeFileSync(malformedConfig, "{malformed");

        // Set up environment
        process.env.MASTER_CONFIG_PATH = validConfig;
        process.env.TEST_API_KEY = "test-key";
    });

    afterEach(() => {
        // Clean up test files
        unlinkSync(validConfig);
        unlinkSync(invalidConfig);
        unlinkSync(malformedConfig);
        rmdirSync(testDir);

        // Reset environment
        delete process.env.MASTER_CONFIG_PATH;
        delete process.env.TEST_API_KEY;
    });

    describe("loadConfig", () => {
        it("should load and validate config successfully", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* service.loadConfig({
                    filePath: validConfig,
                    schema: TestSchema
                });
                expect(result).toEqual({ name: "test", value: 123 });
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should handle validation errors", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig({
                        filePath: invalidConfig,
                        schema: TestSchema
                    })
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                }
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should handle parse errors", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig({
                        filePath: malformedConfig,
                        schema: TestSchema
                    })
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigParseError);
                }
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            ));

        it("should handle file read errors", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(
                    service.loadConfig({
                        filePath: join(testDir, "missing.json"),
                        schema: TestSchema
                    })
                );
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                }
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            ));
    });

    describe("environment variables", () => {
        it("should get API key from environment", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("TEST");
                expect(apiKey).toBe("test-key");
            }));

        it("should return empty string for missing API key", () =>
            Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const apiKey = yield* service.getApiKey("MISSING");
                expect(apiKey).toBe("");
            }));
    });
});
