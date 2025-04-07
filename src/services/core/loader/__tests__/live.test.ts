/**
 * @file Tests for the EntityLoaderApi live implementation.
 */

import { Cause, Effect, Exit, Layer, Option } from "effect";
import { BunContext } from "@effect/platform-bun"; // Use BunContext for platform layer
import { FileSystem } from "@effect/platform"; // Import FileSystem namespace
import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
} from "@core/loader/errors.js";
import { EntityLoaderApiLiveLayer } from "@core/loader/live.js";
import { EntityLoaderApi } from "@core/loader/types.js";
import {
    invalidJsonContent,
    invalidJsonFilename,
    nonExistentFilename,
    validEntityData,
    validEntityFileContent,
    validEntityFilename,
    ValidEntitySchema,
    validationErrorContent,
    validationErrorFilename,
} from "./test-data.js";
import type { ValidEntity } from "./test-data.ts";

// --- Test Setup ---
let tempDir = "";

beforeAll(async () => {
    tempDir = await nodeFs.mkdtemp(
        nodePath.join(os.tmpdir(), "effagent-loader-test-"),
    );
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
describe("EntityLoaderApiLive (Real FileSystem)", () => {
    const TestLayer = Layer.merge(EntityLoaderApiLiveLayer, BunContext.layer);

    // Define the full context required by the effects within the tests
    type TestEffectRequirements = EntityLoaderApi | FileSystem.FileSystem;

    // Update helper signatures to accept the full required context
    const runTest = <E, A>(
        effect: Effect.Effect<A, E, TestEffectRequirements>, // Use combined requirements
    ) => Effect.runPromise(Effect.provide(effect, TestLayer));

    const runFailTest = <E, A>(
        effect: Effect.Effect<A, E, TestEffectRequirements>, // Use combined requirements
    ) => Effect.runPromise(Effect.exit(Effect.provide(effect, TestLayer)));

    it("should load and validate a valid entity file", async () => {
        const filePath = nodePath.join(tempDir, validEntityFilename);
        // This effect requires EntityLoaderApi | FileSystem.FileSystem
        const effect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApi;
            const result = yield* loader.loadEntity<ValidEntity, unknown>(filePath, {
                schema: ValidEntitySchema,
            });
            expect(result).toEqual(validEntityData);
            return result;
        });
        // runTest now correctly accepts this effect type
        await expect(runTest(effect)).resolves.toEqual(validEntityData);
    });

    it("should fail with EntityLoadError if file does not exist", async () => {
        const filePath = nodePath.join(tempDir, nonExistentFilename);
        // This effect requires EntityLoaderApi | FileSystem.FileSystem
        const effect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApi;
            return yield* loader.loadEntity<ValidEntity, unknown>(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // runFailTest now correctly accepts this effect type
        const exit = await runFailTest(effect);

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit)
            ? Cause.failureOption(exit.cause)
            : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            const failure = failureOption.value;
            expect(failure._tag).toBe("EntityLoadError");
            expect((failure as EntityLoadError).message).toContain(
                "Entity definition file not found",
            );
            expect((failure as EntityLoadError).filePath).toBe(filePath);
        }
    });

    it("should fail with EntityParseError for invalid JSON", async () => {
        const filePath = nodePath.join(tempDir, invalidJsonFilename);
        // This effect requires EntityLoaderApi | FileSystem.FileSystem
        const effect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApi;
            return yield* loader.loadEntity<ValidEntity, unknown>(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // runFailTest now correctly accepts this effect type
        const exit = await runFailTest(effect);

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit)
            ? Cause.failureOption(exit.cause)
            : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            const failure = failureOption.value;
            expect(failure._tag).toBe("EntityParseError");
            expect((failure as EntityParseError).filePath).toBe(filePath);
            expect(failure.cause).toBeInstanceOf(SyntaxError);
        }
    });

    it("should fail with EntityValidationError for schema mismatch", async () => {
        const filePath = nodePath.join(tempDir, validationErrorFilename);
        // This effect requires EntityLoaderApi | FileSystem.FileSystem
        const effect = Effect.gen(function* () {
            const loader = yield* EntityLoaderApi;
            return yield* loader.loadEntity<ValidEntity, unknown>(filePath, {
                schema: ValidEntitySchema,
            });
        });
        // runFailTest now correctly accepts this effect type
        const exit = await runFailTest(effect);

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit)
            ? Cause.failureOption(exit.cause)
            : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            const failure = failureOption.value;
            expect(failure._tag).toBe("EntityValidationError");
            expect((failure as EntityValidationError).filePath).toBe(filePath);
            expect(failure.cause).toHaveProperty("_tag", "ParseError");
        }
    });
});
