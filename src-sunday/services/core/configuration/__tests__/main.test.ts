// File: src/services/core/configuration/__tests__/main.test.ts

import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { Cause, DefaultServices, Effect, Exit, Layer, Option } from "effect";
// Import test functions directly from vitest
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "@/services/errors.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "../errors.js";
import { ConfigLoaderApiLiveLayer } from "../main.js";
// Import service types, errors, implementation layer
import { ConfigLoaderApi, ConfigLoaderOptions } from "../types.js";
import { invalidJsonContent, invalidJsonFilename, nonExistentFilename, validConfigData, validConfigFileContent, validConfigFilename, validSchema, validationErrorContent, validationErrorFilename } from "./test-data.js";
// Assuming test data is moved to a separate file like test-data.ts
import type { ValidConfig } from "./test-data.ts";


// --- Test Setup (remains the same) ---
let tempDir = "";
let testOptions: ConfigLoaderOptions;
let TestConfigLoaderOptionsLayer: Layer.Layer<ConfigLoaderOptions>;
beforeAll(async () => {
    tempDir = await nodeFs.mkdtemp(nodePath.join(os.tmpdir(), "effagent-cfg-test-"));
    testOptions = { basePath: tempDir };
    TestConfigLoaderOptionsLayer = Layer.succeed(ConfigLoaderOptions, testOptions);
    // Pre-create files...
    await nodeFs.writeFile(nodePath.join(tempDir, validConfigFilename), validConfigFileContent);
    await nodeFs.writeFile(nodePath.join(tempDir, invalidJsonFilename), invalidJsonContent);
    await nodeFs.writeFile(nodePath.join(tempDir, validationErrorFilename), validationErrorContent);
    await nodeFs.mkdir(nodePath.join(tempDir, "subdir"));
    await nodeFs.writeFile(nodePath.join(tempDir, "subdir", "nested.json"), validConfigFileContent);
});
afterAll(async () => {
    if (tempDir) { await nodeFs.rm(tempDir, { recursive: true, force: true }); }
});

// --- Test Suite ---
describe("ConfigLoaderApiLive (Real FileSystem - DefaultServices Workaround)", () => {

    // Create the full layer providing the implementation, options,
    // and the default platform services (including FileSystem, Path) via DefaultServices
    const TestLayer = ConfigLoaderApiLiveLayer.pipe(
        Layer.provide(TestConfigLoaderOptionsLayer),
        Layer.provide(Layer.succeedContext(DefaultServices.liveServices))
    );

    // Use 'it' imported from '@effect/vitest'
    // Provide the layer to each test Effect using .pipe(Effect.provide(TestLayer))

    it("should load and validate a valid config file", () =>
        Effect.gen(function* () {
            const loader = yield* ConfigLoaderApi;
            const result = yield* loader.loadConfig<ValidConfig>(validConfigFilename, { schema: validSchema });
            expect(result).toEqual(validConfigData);
        }).pipe(Effect.provide(TestLayer)) // Provide layer to the test Effect
    ); // No second argument needed for 'it'

    it("should fail with ConfigReadError if file does not exist", () =>
        Effect.gen(function* () {
            const loader = yield* ConfigLoaderApi;
            const effect = loader.loadConfig<ValidConfig>(nonExistentFilename, { schema: validSchema });
            const exit = yield* Effect.exit(effect);

            expect(exit._tag).toBe("Failure");
            const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
            expect(Option.isSome(failureOption)).toBe(true);
            if (Option.isSome(failureOption)) {
                const failure = failureOption.value;
                expect(failure._tag).toBe("AppError");
                expect((failure as AppError).context?.["errorType"]).toBe("ConfigReadError");
                expect((failure as ConfigReadError).message).toContain("Configuration file not found");
                expect((failure as ConfigReadError).context?.["filePath"]).toBe(nodePath.join(tempDir, nonExistentFilename));
            }
        }).pipe(Effect.provide(TestLayer)) // Provide layer to the test Effect
    );

    it("should fail with ConfigParseError for invalid JSON", () =>
        Effect.gen(function* () {
            const loader = yield* ConfigLoaderApi;
            const effect = loader.loadConfig<ValidConfig>(invalidJsonFilename, { schema: validSchema });
            const exit = yield* Effect.exit(effect);

            expect(exit._tag).toBe("Failure");
            const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
            expect(Option.isSome(failureOption)).toBe(true);
            if (Option.isSome(failureOption)) {
                const failure = failureOption.value;
                expect(failure._tag).toBe("AppError");
                expect((failure as AppError).context?.["errorType"]).toBe("ConfigParseError");
                expect((failure as ConfigParseError).context?.["filePath"]).toBe(nodePath.join(tempDir, invalidJsonFilename));
            }
        }).pipe(Effect.provide(TestLayer)) // Provide layer to the test Effect
    );

    it("should fail with ConfigValidationError for schema mismatch", () =>
        Effect.gen(function* () {
            const loader = yield* ConfigLoaderApi;
            const effect = loader.loadConfig<ValidConfig>(validationErrorFilename, { schema: validSchema });
            const exit = yield* Effect.exit(effect);

            expect(exit._tag).toBe("Failure");
            const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
            expect(Option.isSome(failureOption)).toBe(true);
            if (Option.isSome(failureOption)) {
                const failure = failureOption.value;
                expect(failure._tag).toBe("AppError");
                expect((failure as AppError).context?.["errorType"]).toBe("ConfigValidationError");
                const validationError = failure as ConfigValidationError;
                expect(validationError.context?.["filePath"]).toBe(nodePath.join(tempDir, validationErrorFilename));
                expect(validationError.zodError).toBeDefined();
                expect(validationError.zodError?.errors[0]?.path).toEqual(["name"]);
            }
        }).pipe(Effect.provide(TestLayer)) // Provide layer to the test Effect
    );

    it("should correctly join paths for configs in subfolders", () =>
        Effect.gen(function* () {
            const loader = yield* ConfigLoaderApi;
            const filename = "subdir/nested.json";
            const result = yield* loader.loadConfig<ValidConfig>(filename, { schema: validSchema });
            expect(result).toEqual(validConfigData);
        }).pipe(Effect.provide(TestLayer)) // Provide layer to the test Effect
    );
});

// Assuming test data is moved to a separate file like test-data.ts
// ... test data definitions ...

