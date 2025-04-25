// File: src/services/core/configuration/__tests__/configuration.test.ts

import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { Cause, Config, ConfigProvider, Context, DefaultServices, Effect, Exit, Layer, Option, Scope } from "effect";
// Use standard vitest functions
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import type { ConfigError } from "effect/ConfigError"; // Import ConfigError type
import { ConfigLoaderOptionsLiveLayer } from "../configuration.js"; // Import the Layer under test
// Import service types, errors, implementation layer
import { ConfigLoaderOptions } from "../types.js"; // Import the Tag

// --- Test Setup ---
let tempDir = ""; // Will hold the path to the temporary directory
let testOptions: ConfigLoaderOptions;
let TestConfigLoaderOptionsLayer: Layer.Layer<ConfigLoaderOptions>;

// Create a unique temporary directory before all tests
beforeAll(async () => {
    try {
        // Use a unique path within the OS temp dir
        tempDir = await nodeFs.mkdtemp(nodePath.join(os.tmpdir(), "effagent-cfg-opts-test-"));
        testOptions = { basePath: tempDir }; // Set basePath for the tests
        TestConfigLoaderOptionsLayer = Layer.succeed(ConfigLoaderOptions, testOptions); // Create options layer
        console.log(`Created temp directory for ConfigLoaderOptions tests: ${tempDir}`);
        // No need to create files for *this* test suite, only for ConfigLoaderApi tests
    } catch (err) {
        console.error("Failed to create temp directory:", err);
        throw err; // Fail fast if setup fails
    }
});

// Remove the temporary directory after all tests
afterAll(async () => {
    if (tempDir) {
        try {
            await nodeFs.rm(tempDir, { recursive: true, force: true });
            console.log(`Removed temp directory: ${tempDir}`);
        } catch (err) {
            console.error(`Failed to remove temp directory ${tempDir}:`, err);
        }
    }
});


// --- Test Suite ---
describe("ConfigLoaderOptionsLiveLayer", () => {

    // Test case 1: Environment variable NOT set, should use default
    it("should provide default basePath when CONFIG_BASE_PATH is not set", async () => { // Mark test as async
        const program = Effect.gen(function* () {
            const options = yield* ConfigLoaderOptions;
            expect(options.basePath).toBe("./config"); // Check against the default in configuration.ts
        });

        // Provide the layer under test. It will use the default ConfigProvider.
        await Effect.runPromise(program.pipe(
            Effect.provide(ConfigLoaderOptionsLiveLayer)
        ));
    });

    // Test case 2: Environment variable IS set, should use its value
    it("should provide basePath from CONFIG_BASE_PATH environment variable when set", async () => { // Mark test as async
        const customPath = "/custom/path/from/env";

        // 1. Create a ConfigProvider that simulates the environment variable
        const testConfigProvider = ConfigProvider.fromMap(
            new Map([["CONFIG_BASE_PATH", customPath]])
        );

        // 2. Create a layer that replaces the default ConfigProvider
        const configProviderLayer = Layer.setConfigProvider(testConfigProvider);

        // 3. Build the final layer for this test:
        //    Start with the layer under test, then provide the custom ConfigProvider layer to it.
        const testLayer = Layer.provide(
            ConfigLoaderOptionsLiveLayer, // Needs ConfigProvider implicitly
            configProviderLayer          // Provides the simulated env var
        );

        // 4. Define the test effect
        const program = Effect.gen(function* () {
            const options = yield* ConfigLoaderOptions;
            expect(options.basePath).toBe(customPath); // Assert against the custom path
        });

        // Provide the composed testLayer and run manually
        await Effect.runPromise(program.pipe(
            Effect.provide(testLayer)
        ));
    });
    // Test case 3: Required config variable is missing
    it("should fail with ConfigError if a required config (without default) is missing", async () => { // Mark test as async

        // Define a Config that requires a variable we WON'T provide
        const requiredConfig = Config.string("SOME_MISSING_VAR_THAT_DOES_NOT_EXIST");

        // Create an Effect that tries to load this required config by yielding it
        const program = Effect.gen(function* () {
            // Yielding the Config object triggers the lookup via ConfigProvider
            const value = yield* requiredConfig;
            // This line should not be reached if the config is missing
            return value;
        });

        // Run the effect and expect it to fail.
        // The default ConfigProvider won't find the variable.
        const exit = await Effect.runPromise(Effect.exit(program));

        expect(exit._tag).toBe("Failure");
        expect(Exit.isFailure(exit)).toBe(true);
        // Check the cause includes a ConfigError.MissingData
        const failureOpt = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOpt)).toBe(true);
        // Add more specific checks if needed (e.g., error message contains the var name)
        // console.error(Cause.pretty(exit.cause));
    });

});
