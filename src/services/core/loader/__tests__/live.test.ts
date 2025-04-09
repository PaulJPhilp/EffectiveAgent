/**
 * @file Tests for the EntityLoaderApi live implementation using Layer.build.
 * Tests the refactored service where FileSystem is an internal dependency.
 */

import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { FileSystem } from "@effect/platform"; // Import FileSystem namespace
import { BunContext } from "@effect/platform-bun";
import { Cause, Context, Effect, Exit, Layer, Option, Ref, Scope } from "effect"; // Added Scope
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
} from "@core/loader/errors.js";
import { EntityLoaderApiLiveLayer } from "@core/loader/live.js"; // Import the updated layer
// Import the Tag alias and the derived Type from types.ts
import {
    EntityLoaderApiTag,
    type EntityLoaderApi as EntityLoaderApiType // Derived type
} from "@core/loader/types.js";
// Import test data schema and type
import {
    type ValidEntity, // Import updated type
    ValidEntitySchema, // Import Effect Schema
    invalidJsonContent,
    invalidJsonFilename,
    nonExistentFilename,
    validEntityData,
    validEntityFileContent,
    validEntityFilename,
    validationErrorContent,
    validationErrorFilename,
} from "./test-data.js"; // Assuming test-data.ts exists and is correct

// --- Test Setup ---
let tempDir = "";

beforeAll(async () => {
    tempDir = await nodeFs.mkdtemp(
        nodePath.join(os.tmpdir(), "effagent-loader-test-"),
    );
    // Pre-create files using full paths
    await nodeFs.writeFile(
        nodePath.join(tempDir, validEntityFilename),
        validEntityFileContent,
    );
    await nodeFs.writeFile(
        nodePath.join(tempDir, invalidJsonFilename),
        invalidJsonContent,
    );
    await nodeFs.writeFile(
        nodePath.join(tempDir, validationErrorFilename),
        validationErrorContent,
    );
});

afterAll(async () => {
    if (tempDir) {
        await nodeFs.rm(tempDir, { recursive: true, force: true });
    }
});

// --- Test Suite ---
describe("EntityLoaderApiLive (FileSystem Encapsulated with Layer.build)", () => {

    // Define the full layer composition including platform context
    // EntityLoaderApiLiveLayer requires FileSystem
    // BunContext.layer provides FileSystem
    const combinedLayer = Layer.provide(EntityLoaderApiLiveLayer, BunContext.layer);
    // combinedLayer provides EntityLoaderApi and requires nothing

    // Build the context effect - resolves layers and manages scope
    // Requires Scope, provides Context<EntityLoaderApi>
    const managedContext = Effect.scoped(Layer.build(combinedLayer));

    // Helper to run effects by providing the built context
    const runTestWithContext = <E, A>(testEffect: Effect.Effect<A, E, EntityLoaderApiType>) => {
        // Create the effect that first builds the context, then provides it to the test effect
        const runnable = managedContext.pipe(
            Effect.flatMap(context => Effect.provide(testEffect, context))
        );
        // Run the combined effect (requires Scope, runPromise provides it)
        return Effect.runPromise(runnable);
    };

    const runFailTestWithContext = <E, A>(testEffect: Effect.Effect<A, E, EntityLoaderApiType>) => {
        const runnable = managedContext.pipe(
            Effect.flatMap(context => Effect.provide(testEffect, context))
        );
        // Run the combined effect (requires Scope, runPromiseExit provides it)
        return Effect.runPromiseExit(runnable);
    };


    // --- Tests for loadEntity ---

    it("should load and validate a valid entity file", async () => {
        const filePath = nodePath.join(tempDir, validEntityFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            const result = yield* loader.loadEntity(filePath, {
                schema: ValidEntitySchema,
            });
            expect(result).toEqual(validEntityData);
            return result;
        });
        // Use the Layer.build helper
        await expect(runTestWithContext(testEffect)).resolves.toEqual(validEntityData);
    });

    it("should fail loadEntity with EntityLoadError if file does not exist", async () => {
        const filePath = nodePath.join(tempDir, nonExistentFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            return yield* loader.loadEntity(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // Use the Layer.build helper
        const exit = await runFailTestWithContext(testEffect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityLoadError");
                expect((failure.value as EntityLoadError).message).toContain("Entity definition file not found");
                expect((failure.value as EntityLoadError).filePath).toBe(filePath);
            }
        } else { expect.fail("Expected effect to fail"); }
    });

    it("should fail loadEntity with EntityParseError for invalid JSON", async () => {
        const filePath = nodePath.join(tempDir, invalidJsonFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            return yield* loader.loadEntity(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // Use the Layer.build helper
        const exit = await runFailTestWithContext(testEffect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityParseError");
                expect((failure.value as EntityParseError).filePath).toBe(filePath);
                expect(failure.value.cause).toBeInstanceOf(SyntaxError);
            }
        } else { expect.fail("Expected effect to fail"); }
    });

    it("should fail loadEntity with EntityValidationError for schema mismatch", async () => {
        const filePath = nodePath.join(tempDir, validationErrorFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            return yield* loader.loadEntity(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // Use the Layer.build helper
        const exit = await runFailTestWithContext(testEffect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityValidationError");
                expect((failure.value as EntityValidationError).filePath).toBe(filePath);
                expect(failure.value.cause).toHaveProperty("_tag", "ParseError");
            }
        } else { expect.fail("Expected effect to fail"); }
    });


    // --- Tests for loadRawEntity ---

    it("should load raw entity, skipping validation", async () => {
        const filePath = nodePath.join(tempDir, validationErrorFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            const result = yield* loader.loadRawEntity(filePath, { skipValidation: true });
            expect(result).toEqual({ name: 999, value: 456 });
        });
        // Use the Layer.build helper
        await expect(runTestWithContext(testEffect)).resolves.toBeUndefined();
    });

    it("should fail loadRawEntity with EntityParseError for invalid JSON", async () => {
        const filePath = nodePath.join(tempDir, invalidJsonFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            return yield* loader.loadRawEntity(filePath, { skipValidation: true });
        });
        // Use the Layer.build helper
        const exit = await runFailTestWithContext(testEffect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityParseError");
                expect((failure.value as EntityParseError).filePath).toBe(filePath);
                expect(failure.value.cause).toBeInstanceOf(SyntaxError);
            }
        } else { expect.fail("Expected effect to fail"); }
    });

    it("should fail loadRawEntity with EntityLoadError if file does not exist", async () => {
        const filePath = nodePath.join(tempDir, nonExistentFilename);
        // Effect requires EntityLoaderApi
        const testEffect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApiTag;
            return yield* loader.loadRawEntity(filePath, { skipValidation: true });
        });
        // Use the Layer.build helper
        const exit = await runFailTestWithContext(testEffect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("EntityLoadError");
                expect((failure.value as EntityLoadError).filePath).toBe(filePath);
            }
        } else { expect.fail("Expected effect to fail"); }
    });

});
