/**
 * @file Tests for the PromptConfigLiveLayer and PromptApiLiveLayer.
 * Uses step-by-step Layer.provide and a final Layer.merge for composition.
 */

import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { BunContext } from "@effect/platform-bun";
import { Cause, Context, Effect, Exit, HashMap, Layer, Option, Ref, Scope } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    PromptConfigError,
    RenderingError,
    TemplateNotFoundError,
} from "@services/ai/prompt/errors.js";
import {
    PromptApiLiveLayer,
    PromptConfigLiveLayer, // Import the layer factory/definition
} from "@services/ai/prompt/live.js";
import type { PromptDefinition } from "@services/ai/prompt/schema.js";
// Import API, Tags, Layers, Types from the service being tested
import {
    PromptApi,
    PromptConfig,
    type PromptConfigData,
} from "@services/ai/prompt/types.js";

import { EntityLoadError, EntityParseError } from "@services/core/loader/errors.js";
import { EntityLoaderApiLiveLayer } from "@services/core/loader/live.js";
// Import dependencies
import {
    EntityLoaderApi as EntityLoaderApiTag, // Import Tag alias
    type EntityLoaderApi as EntityLoaderApiType // Import derived type
} from "@services/core/loader/types.js";

import type { EntityId } from "@/types.js"; // Corrected path alias

// --- Test Setup ---

let tempDir = "";
const promptsFilename = "prompts.json";
let promptsFilePath = ""; // Store absolute path

// Sample prompt data
const promptDef1: PromptDefinition = {
    name: "test-greeting",
    template: "Hello, {{name}}!",
    description: "A simple greeting",
};
const promptDef2: PromptDefinition = {
    name: "test-summary",
    template: "Summarize this: {{text}}",
};
const validPromptsFileContent = JSON.stringify({
    prompts: [promptDef1, promptDef2],
});
const invalidJsonContent = "{ prompts: [ ";
const invalidSchemaContent = JSON.stringify({
    prompts: [{ name: "bad", template: null }],
});
const emptyPromptsContent = JSON.stringify({
    prompts: [],
});


beforeAll(async () => {
    tempDir = await nodeFs.mkdtemp(
        nodePath.join(os.tmpdir(), "effagent-prompt-test-"),
    );
    promptsFilePath = nodePath.join(tempDir, promptsFilename);
    await nodeFs.writeFile(promptsFilePath, validPromptsFileContent);
});

afterAll(async () => {
    if (tempDir) {
        await nodeFs.rm(tempDir, { recursive: true, force: true });
    }
});

// --- Layer Setup ---

// Layer providing EntityLoaderApi (depends on BunContext)
const baseLoaderLayer = EntityLoaderApiLiveLayer.pipe(Layer.provide(BunContext.layer));
// baseLoaderLayer provides EntityLoaderApi, Requires never

// Layer providing PromptConfigData (depends on EntityLoaderApi)
const testPromptConfigLayer = PromptConfigLiveLayer(promptsFilePath).pipe(
    Layer.provide(baseLoaderLayer) // Provide EntityLoader dependency
);
// testPromptConfigLayer provides PromptConfigData, Requires never

// Layer providing PromptApi (depends on PromptConfigData)
const testPromptApiLayer = PromptApiLiveLayer.pipe(
    Layer.provide(testPromptConfigLayer) // Provide PromptConfigData dependency
);
// testPromptApiLayer provides PromptApi, Requires never

// Define the final layer for API tests by MERGING the two final service layers
// This explicitly provides both services needed by the test effects.
const TestApiLayer = Layer.merge(testPromptApiLayer, testPromptConfigLayer);
// TestApiLayer provides (PromptApi | PromptConfigData), Requires never.


// --- Helper Functions (with Type Assertion Workaround) ---

// Helper type for asserting success type
type EffectSuccess<T> = T extends Effect.Effect<infer A, any, any> ? A : never;

// Helper to run effects requiring PromptApi (and potentially PromptConfigData)
// The TestApiLayer provides both.
const runApiTest = <E, A>(testEffect: Effect.Effect<A, E, PromptApi | PromptConfigData>) => {
    // Provide the merged TestApiLayer
    // Use type assertion as inference might still struggle
    const runnable = Effect.provide(testEffect, TestApiLayer) as Effect.Effect<
        A, E, never
    >;
    return Effect.runPromise(runnable);
};

const runApiFailTest = <E, A>(testEffect: Effect.Effect<A, E, PromptApi | PromptConfigData>) => {
    const runnable = Effect.provide(testEffect, TestApiLayer) as Effect.Effect<
        A, E, never // Assert R=never, E can be anything
    >;
    return Effect.runPromiseExit(runnable);
};


// --- Test Suite ---
describe("Prompt Layers (Revised Merge)", () => {

    // --- PromptConfigLiveLayer Tests ---
    describe("PromptConfigLiveLayer", () => {
        // These tests only need testPromptConfigLayer

        const runConfigTest = <E, A>(effect: Effect.Effect<A, E, PromptConfigData>) => {
            const runnable = Effect.provide(effect, testPromptConfigLayer) as Effect.Effect<
                A, E, never
            >;
            return Effect.runPromise(runnable);
        };

        it("should load prompts and provide PromptConfigData HashMap", async () => {
            // Effect requires PromptConfigData
            const effect = Effect.gen(function* () {
                const promptData = yield* PromptConfig;
                expect(HashMap.has(promptData, "test-greeting")).toBe(true);
                expect(HashMap.has(promptData, "test-summary")).toBe(true);
                const greeting = HashMap.get(promptData, "test-greeting");
                expect(Option.isSome(greeting)).toBe(true);
                if (Option.isSome(greeting)) {
                    expect(greeting.value.name).toBe(promptDef1.name);
                    expect(greeting.value.template).toBe(promptDef1.template);
                    expect(greeting.value.description).toBe(promptDef1.description);
                }
                expect(HashMap.size(promptData)).toBe(2);
            });
            await expect(runConfigTest(effect)).resolves.toBeUndefined();
        });

        it("should fail with PromptConfigError if file is missing", async () => {
            const missingFilePath = nodePath.join(tempDir, "missing.json");
            // Test building the layer with a bad path
            const layerToTest = PromptConfigLiveLayer(missingFilePath).pipe(
                Layer.provide(baseLoaderLayer)
            );
            const effect = Effect.scoped(Layer.build(layerToTest));
            const exit = await Effect.runPromiseExit(effect);

            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("PromptConfigError");
                    expect((failure.value as PromptConfigError).cause).toHaveProperty("_tag", "EntityLoadError");
                }
            } else { expect.fail("Layer build should have failed"); }
        });

        it("should fail with PromptConfigError for invalid JSON", async () => {
            await nodeFs.writeFile(promptsFilePath, invalidJsonContent);
            const layerToTest = PromptConfigLiveLayer(promptsFilePath).pipe(
                Layer.provide(baseLoaderLayer)
            );
            const effect = Effect.scoped(Layer.build(layerToTest));
            const exit = await Effect.runPromiseExit(effect);

            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("PromptConfigError");
                    expect((failure.value as PromptConfigError).cause).toHaveProperty("_tag", "EntityParseError");
                }
            } else { expect.fail("Layer build should have failed"); }
            await nodeFs.writeFile(promptsFilePath, validPromptsFileContent);
        });

        it("should fail with PromptConfigError for invalid schema", async () => {
            await nodeFs.writeFile(promptsFilePath, invalidSchemaContent);
            const layerToTest = PromptConfigLiveLayer(promptsFilePath).pipe(
                Layer.provide(baseLoaderLayer)
            );
            const effect = Effect.scoped(Layer.build(layerToTest));
            const exit = await Effect.runPromiseExit(effect);

            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("PromptConfigError");
                    expect((failure.value as PromptConfigError).cause).toHaveProperty("_tag", "ParseError");
                }
            } else { expect.fail("Layer build should have failed"); }
            await nodeFs.writeFile(promptsFilePath, validPromptsFileContent);
        });

        it("should fail with PromptConfigError for empty prompts array", async () => {
            await nodeFs.writeFile(promptsFilePath, emptyPromptsContent);
            const layerToTest = PromptConfigLiveLayer(promptsFilePath).pipe(
                Layer.provide(baseLoaderLayer)
            );
            const effect = Effect.scoped(Layer.build(layerToTest));
            const exit = await Effect.runPromiseExit(effect);

            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("PromptConfigError");
                    expect((failure.value as PromptConfigError).cause).toHaveProperty("_tag", "ParseError");
                }
            } else { expect.fail("Layer build should have failed"); }
            await nodeFs.writeFile(promptsFilePath, validPromptsFileContent);
        });
    }); // End describe PromptConfigLiveLayer


    // --- PromptApiLiveLayer Tests ---
    describe("PromptApiLiveLayer", () => {

        it("should render a string template", async () => {
            // Effect requires PromptApi
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                const result = yield* promptApi.renderString({
                    templateString: "Input: {{input}}",
                    context: { input: "test data" }
                });
                expect(result).toBe("Input: test data");
            });
            // Use runApiTest helper
            await expect(runApiTest(testEffect)).resolves.toBeUndefined();
        });

        it("should fail renderString with RenderingError for invalid template syntax", async () => {
            // Effect requires PromptApi
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                return yield* promptApi.renderString({
                    templateString: "Input: {{input", // Unclosed tag
                    context: { input: "test data" }
                });
            });
            // Use runApiFailTest helper
            const exit = await runApiFailTest(testEffect);
            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("RenderingError");
                }
            } else { expect.fail("Expected rendering error"); }
        });


        it("should render a named template", async () => {
            // Effect requires PromptApi
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                const result = yield* promptApi.renderTemplate({
                    templateName: "test-greeting",
                    context: { name: "Paul" }
                });
                expect(result).toBe("Hello, Paul!");
            });
            // Use runApiTest helper
            await expect(runApiTest(testEffect)).resolves.toBeUndefined();
        });

        it("should fail renderTemplate with TemplateNotFoundError for unknown name", async () => {
            // Effect requires PromptApi
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                return yield* promptApi.renderTemplate({
                    templateName: "unknown-template",
                    context: { name: "Paul" }
                });
            });
            // Use runApiFailTest helper
            const exit = await runApiFailTest(testEffect);
            expect(exit._tag).toBe("Failure");
            if (Exit.isFailure(exit)) {
                const failure = Cause.failureOption(exit.cause);
                expect(Option.isSome(failure)).toBe(true);
                if (Option.isSome(failure)) {
                    expect(failure.value._tag).toBe("TemplateNotFoundError");
                    expect((failure.value as TemplateNotFoundError).templateName).toBe("unknown-template");
                }
            } else { expect.fail("Expected template not found error"); }
        });

        // TODO: Add a test for RenderingError within renderTemplate if possible

    }); // End describe PromptApiLiveLayer
}); // End describe Prompt Layers

// --- beforeAll/afterAll and test data definitions (copied for completeness) ---
// Note: These are defined globally above, no need to repeat here.
