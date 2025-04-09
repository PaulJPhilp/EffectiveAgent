/**
 * @file Tests for the ProviderConfigLiveLayer.
 * @module services/ai/provider/__tests__/live.test
 */

import { Cause, Effect, Exit, Layer, Option } from "effect"; // Added Option, HashMap, Cause
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

// Service under test
import { ProviderConfigLiveLayer } from "../live.js";

import { EntityLoadError, EntityParseError } from "@/services/core/loader/errors.js";
// Dependencies
import { EntityLoaderApi, EntityLoaderApiTag } from "@/services/core/loader/types.js";

// Node.js modules for file system operations
import * as fs from "node:fs/promises"; // Switch back to promises
import { tmpdir } from "node:os";
import * as path from "node:path";

import { JsonValue } from "@/types.js";
import { ProviderConfigError } from "../errors.js";
import { ProviderConfigData } from "../types.js";

// --- Test Configuration ---
const TEST_DIR_PREFIX = "provider-config-test-";

// --- Test Helpers ---

/**
 * Runs an Effect test that is expected to succeed.
 * Provides the necessary context layer.
 */
const runTest = <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    layer: Layer.Layer<R, E, any> // Allow any layer output
): Promise<A> => {
    const runnable = Effect.provide(effect, layer);
    return Effect.runPromise(runnable as Effect.Effect<A, E, never>); // Runtime cast is fine
};

/**
 * Runs an Effect test that is expected to fail.
 * Provides the necessary context layer.
 */
const runFailTest = <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    layer: Layer.Layer<R, E | ProviderConfigError, any> // Allow any layer output
): Promise<Exit.Exit<A, E | ProviderConfigError>> => {
    const runnable = Effect.provide(effect, layer);
    return Effect.runPromiseExit(runnable as Effect.Effect<A, E | ProviderConfigError, never>); // Runtime cast is fine
};

// --- Test Suite Setup ---

describe("ProviderConfigLiveLayer", () => {
    let testDirPath: string;
    let TestLayer: Layer.Layer<never, ProviderConfigError, ProviderConfigData>;

    // Define the mock implementation within the describe block to access testDirPath
    const mockEntityLoader: EntityLoaderApi = {
        loadEntity: <T, I>() => Effect.fail(new EntityLoadError({ filePath: "test" })),
        loadRawEntity: (filePath: string, _options: { skipValidation: true }): Effect.Effect<JsonValue, EntityLoadError | EntityParseError> => Effect.gen(function* () {
            const fullPath = path.join(testDirPath, filePath);

            // Use Effect.tryPromise for access check first
            yield* Effect.tryPromise({
                try: () => fs.access(fullPath), // Returns Promise<void>
                catch: (e) => new EntityLoadError({ filePath: fullPath, cause: e })
            });

            // Then use Effect.tryPromise for reading the content
            const content: string = yield* Effect.tryPromise({
                try: () => fs.readFile(fullPath, 'utf-8'), // Returns Promise<string>
                catch: (e) => new EntityLoadError({ filePath: fullPath, cause: e })
            });

            // Finally, use Effect.try for parsing (JSON.parse is sync)
            return yield* Effect.try({
                try: () => JSON.parse(content) as JsonValue,
                catch: (e) => new EntityParseError({ filePath: fullPath, cause: e })
            });
        })
    };

    beforeEach(async () => {
        // Create a unique temporary directory for each test
        testDirPath = await fs.mkdtemp(path.join(tmpdir(), TEST_DIR_PREFIX));

        // Define mock loader within beforeEach to capture current testDirPath
        const mockEntityLoader: EntityLoaderApi = {
            loadEntity: <T, I>() => Effect.fail(new EntityLoadError({ filePath: "test" })),
            loadRawEntity: (filePath: string, _options: { skipValidation: true }): Effect.Effect<JsonValue, EntityLoadError | EntityParseError> => Effect.gen(function* () {
                const fullPath = path.join(testDirPath, filePath);

                // Use Effect.tryPromise for access check first
                yield* Effect.tryPromise({
                    try: () => fs.access(fullPath), // Returns Promise<void>
                    catch: (e) => new EntityLoadError({ filePath: fullPath, cause: e })
                });

                // Then use Effect.tryPromise for reading the content
                const content: string = yield* Effect.tryPromise({
                    try: () => fs.readFile(fullPath, 'utf-8'), // Returns Promise<string>
                    catch: (e) => new EntityLoadError({ filePath: fullPath, cause: e })
                });

                // Finally, use Effect.try for parsing (JSON.parse is sync)
                return yield* Effect.try({
                    try: () => JSON.parse(content) as JsonValue,
                    catch: (e) => new EntityParseError({ filePath: fullPath, cause: e })
                });
            })
        };

        // Define the TestLayer within beforeEach using the current mockEntityLoader
        TestLayer = Layer.provide(
            ProviderConfigLiveLayer,
            Layer.succeed(EntityLoaderApiTag, mockEntityLoader)
        );

        // Mock process.cwd() to point to the temporary directory
        vi.spyOn(process, "cwd").mockReturnValue(testDirPath);
    });

    afterEach(async () => {
        // Clean up the temporary directory
        if (testDirPath) {
            await fs.rm(testDirPath, { recursive: true, force: true });
        }
        // Restore original process.cwd()
        vi.restoreAllMocks();
    });

    it("should load and provide valid provider configuration", async () => {
        await fs.writeFile(path.join(testDirPath, "providers.json"), JSON.stringify({
            providers: [
                {
                    name: "test-provider",
                    displayName: "Test Provider",
                    type: "test",
                    apiKeyEnvVar: "TEST_API_KEY",
                    baseUrl: "https://test.com",
                    rateLimit: {
                        requestsPerMinute: 10,
                        tokensPerMinute: 1000
                    }
                }
            ],
            defaultProviderName: "test-provider"
        }), { encoding: 'utf-8' });
        // Revert back to simple effect
        await runTest(Effect.succeed(void 0), TestLayer);
    });

    it("should fail with ProviderConfigError if config file is missing", async () => {
        // Revert back to simple effect
        const exit = await runFailTest(Effect.succeed(void 0), TestLayer);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrNull(Cause.failureOption(exit.cause)) as ProviderConfigError | null;
            expect(error?._tag).toBe("ProviderConfigError");
            expect(error?.cause).toBeDefined();
            expect(error?.cause?._tag).toBe("EntityLoadError");
        }
    });

    it("should fail with ProviderConfigError if config file has invalid JSON", async () => {
        await fs.writeFile(path.join(testDirPath, "providers.json"), "{ invalid json }", { encoding: 'utf-8' });
        // Revert back to simple effect
        const exit = await runFailTest(Effect.succeed(void 0), TestLayer);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrNull(Cause.failureOption(exit.cause)) as ProviderConfigError | null;
            expect(error?._tag).toBe("ProviderConfigError");
            expect(error?.cause).toBeDefined();
            expect(error?.cause?._tag).toBe("EntityParseError");
        }
    });

    it("should fail with ProviderConfigError if config file fails schema validation", async () => {
        await fs.writeFile(path.join(testDirPath, "providers.json"), JSON.stringify({
            providers: [
                {
                    name: "test",
                    // Missing required fields
                }
            ],
            defaultProviderName: "test"
        }), { encoding: 'utf-8' });
        // Revert back to simple effect
        const exit = await runFailTest(Effect.succeed(void 0), TestLayer);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Option.getOrNull(Cause.failureOption(exit.cause)) as ProviderConfigError | null;
            expect(error?._tag).toBe("ProviderConfigError");
            expect(error?.message).toContain("Schema validation failed for providers.json");
            // Add check for the specific cause (EntityParseError from schema validation)
            expect(error?.cause?._tag).toBe("EntityParseError");
        }
    });
});
