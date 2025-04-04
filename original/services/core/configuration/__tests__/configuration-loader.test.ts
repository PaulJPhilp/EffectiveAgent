import { NodeContext } from "@effect/platform-node"; // Use the live Node context
import * as EffectVitest from "@effect/vitest";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import * as nodeFs from "node:fs/promises"; // For setup/cleanup
import * as os from "node:os";
import * as nodePath from "node:path";
import { afterAll, beforeAll, describe, expect } from "vitest";
import { z } from "zod";

// --- Import your service code ---
import {
  ConfigLoaderLive,
} from "../configuration-loader"; // Adjust path
import {
  ConfigParseError,
  ConfigReadError,
  ConfigSchemaMissingError,
  ConfigValidationError,
} from "../errors"; // Import from the correct relative path
import { BaseConfigSchema } from "../schema"; // Adjust path
import type {
  ConfigLoaderOptions
} from "../types"; // Adjust path
import {
  ConfigLoader,
  ConfigLoaderOptionsTag,
} from "../types"; // Adjust path

// --- Test Data (Same as before) ---
const validConfig = {
  name: "test-config",
  version: "1.0.0",
  tags: [],
  description: "Test configuration",
};
const validConfigFileContent = JSON.stringify(validConfig);
// ... (other config data remains the same) ...
const complexConfig = { /* ... */ };
const complexConfigFileContent = JSON.stringify(complexConfig);
const invalidJsonContent = "{ name: 'test', version: ";
const validationErrorContent = JSON.stringify({ name: 123, version: "1.0.0", tags: [] });
const testSchema = BaseConfigSchema.extend({});
type TestConfig = z.infer<typeof testSchema>;
const complexSchema = BaseConfigSchema.extend({ /* ... */ });
type ComplexConfig = z.infer<typeof complexSchema>;


// --- Test Setup for Real File System ---

let tempDir = ""; // Will hold the path to the temporary directory
let testOptions: ConfigLoaderOptions;

// Create a unique temporary directory before all tests
beforeAll(async () => {
  try {
    tempDir = await nodeFs.mkdtemp(nodePath.join(os.tmpdir(), "config-loader-test-"));
    testOptions = { basePath: tempDir }; // Set basePath for the tests
    console.log(`Created temp directory for tests: ${tempDir}`);

    // Pre-create common files needed by multiple tests
    await nodeFs.writeFile(nodePath.join(tempDir, "config.json"), validConfigFileContent);
    await nodeFs.writeFile(nodePath.join(tempDir, "complex-config.json"), complexConfigFileContent);
    await nodeFs.writeFile(nodePath.join(tempDir, "invalid-json.json"), invalidJsonContent);
    await nodeFs.writeFile(nodePath.join(tempDir, "validation-error.json"), validationErrorContent);
    // Create subfolder and file for path joining test
    await nodeFs.mkdir(nodePath.join(tempDir, "subfolder"));
    await nodeFs.writeFile(nodePath.join(tempDir, "subfolder", "config.json"), validConfigFileContent);

  } catch (err) {
    console.error("Failed to create temp directory or files:", err);
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
      // Don't throw here, just log, as cleanup failure shouldn't fail tests after they run
    }
  }
});

// --- Test Suite ---

describe("ConfigLoaderLive Implementation Tests (Real FileSystem)", () => {

  // Create the options layer dynamically based on the tempDir
  const TestConfigLoaderOptionsLayer = Layer.sync(
    ConfigLoaderOptionsTag,
    () => {
      if (!testOptions) throw new Error("Test options not initialized");
      return testOptions;
    }
  );

  // Provide the REAL ConfigLoaderLive, the dynamic options layer, and the live Node context
  const TestLayer = Layer.provideMerge(
    ConfigLoaderLive,
    TestConfigLoaderOptionsLayer
  ).pipe(Layer.provide(NodeContext.layer)); // NodeContext.layer provides FileSystem and Path

  EffectVitest.it("should successfully load and validate a config file", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const result = yield* loader.loadConfig<TestConfig>("config.json", {
        schema: testSchema,
      });
      expect(result).toEqual(validConfig);
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should fail with ConfigReadError if file does not exist", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const effect = loader.loadConfig<TestConfig>("not-found.json", {
        schema: testSchema,
      });
      const exit = yield* Effect.exit(effect);

      const failure = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
      expect(Option.isSome(failure)).toBe(true);
      expect(Option.getOrThrow(failure)._tag).toBe("ConfigReadError");
      // Check the path includes the dynamic tempDir
      expect(
        Option.map(failure, (e) => (e as ConfigReadError).filePath).pipe(Option.getOrNull)
      ).toBe(nodePath.join(tempDir, "not-found.json"));
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should fail with ConfigParseError for invalid JSON", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const effect = loader.loadConfig<TestConfig>("invalid-json.json", {
        schema: testSchema,
      });
      const exit = yield* Effect.exit(effect);

      const failure = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
      expect(Option.isSome(failure)).toBe(true);
      const error = Option.getOrThrow(failure);
      expect(error._tag).toBe("ConfigParseError");
      expect((error as ConfigParseError).filePath).toBe(nodePath.join(tempDir, "invalid-json.json"));
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should fail with ConfigValidationError for schema mismatch", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const effect = loader.loadConfig<TestConfig>("validation-error.json", {
        schema: testSchema,
      });
      const exit = yield* Effect.exit(effect);

      const failure = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
      expect(Option.isSome(failure)).toBe(true);
      const error = Option.getOrThrow(failure) as ConfigValidationError;
      expect(error._tag).toBe("ConfigValidationError");
      expect(error?.filePath).toBe(nodePath.join(tempDir, "validation-error.json"));
      // Check if the first error message string contains the field name 'name'
      expect(error?.zodErrors?.[0]).toContain("name");
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should succeed without validation if validate:false", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const result = yield* loader.loadConfig<TestConfig>("validation-error.json", {
        schema: testSchema,
        validate: false,
      });
      // Result is the raw parsed object from the real file
      expect(result).toEqual(JSON.parse(validationErrorContent));
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should fail with ConfigSchemaMissingError if schema is missing and validation is attempted", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const effect = loader.loadConfig("config.json"); // No schema
      const exit = yield* Effect.exit(effect);

      const failure = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
      expect(Option.isSome(failure)).toBe(true);
      expect(Option.getOrThrow(failure)._tag).toBe("ConfigSchemaMissingError");
      expect(
        Option.map(failure, (e) => (e as ConfigSchemaMissingError).filePath).pipe(Option.getOrNull)
      ).toBe(nodePath.join(tempDir, "config.json"));
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should succeed if schema is missing but validate:false", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const result = yield* loader.loadConfig("config.json", { validate: false });
      expect(result).toEqual(validConfig);
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should handle complex nested schemas correctly", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      const result = yield* loader.loadConfig<ComplexConfig>("complex-config.json", {
        schema: complexSchema,
      });
      expect(result).toEqual(complexConfig);
    }).pipe(Effect.provide(TestLayer)));

  EffectVitest.it("should correctly join paths for configs in subfolders", () =>
    Effect.gen(function* () {
      const loader = yield* ConfigLoader;
      // Load from the subfolder created in beforeAll
      const result = yield* loader.loadConfig<TestConfig>("subfolder/config.json", {
        schema: testSchema,
      });
      expect(result).toEqual(validConfig); // Content is the same
    }).pipe(Effect.provide(TestLayer)));
});
