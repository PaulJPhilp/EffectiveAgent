/**
 * @file Tests for the PromptConfigLiveLayer and PromptApiLiveLayer.
 * Uses step-by-step Layer.provide and a final Layer.merge for composition.
 */

import { BunContext } from "@effect/platform-bun";
import { Cause, ConfigProvider, Effect, Exit, HashMap, Layer, Option } from "effect";
import * as nodeFs from "node:fs/promises";
import * as os from "node:os";
import * as nodePath from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
    PromptConfigError,
    TemplateNotFoundError
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

import { EntityLoaderApiLiveLayer } from "@services/core/loader/live.js";
// Import dependencies


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
const testPromptConfigLayer = PromptConfigLiveLayer.pipe(
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
describe("Prompt Layers", () => {
    let tempDir: string;
    let promptsJsonPath: string;

    // Create test files before running tests
    beforeAll(async () => {
        tempDir = nodePath.join(__dirname, "temp");
        await nodeFs.mkdir(tempDir, { recursive: true });
        promptsJsonPath = nodePath.join(tempDir, "prompts.json");

        // Sample valid prompt config
        const validConfig = {
            prompts: [{
                name: "test-greeting",
                template: "Hello, {{name}}!",
                description: "A simple greeting"
            }, {
                name: "test-summary",
                template: "Summarize this: {{text}}"
            }]
        };

        await nodeFs.writeFile(promptsJsonPath, JSON.stringify(validConfig, null, 2));
    });

    // Clean up after tests
    afterAll(async () => {
        if (tempDir) {
            await nodeFs.rm(tempDir, { recursive: true, force: true });
        }
    });
    // Helper to create test layer with config
    const createTestLayer = (config = {
        prompts: [{
            name: "test-greeting",
            template: "Hello, {{name}}!",
            description: "A simple greeting"
        }, {
            name: "test-summary",
            template: "Summarize this: {{text}}"
        }]
    }) => Layer.provide(
        PromptConfigLiveLayer,
        Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromJson({
                prompts: JSON.stringify(config)
            })
        )
    );

    // Create API test layer with default config
    const TestApiLayer = Layer.provide(
        PromptApiLiveLayer,
        createTestLayer()
    );

    describe("PromptConfigLiveLayer", () => {
        it("should load and provide valid prompt configuration", async () => {
            const testEffect = Effect.gen(function* () {
                const testLayer = createTestLayer();
                const accessPromptConfig = Effect.gen(function* () {
                    const configData = yield* PromptConfig;
                    expect(configData).toBeDefined();
                    const greeting = Option.getOrNull(HashMap.get(configData, "test-greeting"));
                    expect(greeting?.template).toBe("Hello, {{name}}!");
                    expect(greeting?.description).toBe("A simple greeting");
                    return configData;
                });
                return yield* Effect.provide(accessPromptConfig, testLayer);
            });

            await Effect.runPromise(testEffect);
        });

        it("should fail with PromptConfigError if config is missing", async () => {
            const testEffect = Effect.gen(function* () {
                const testLayer = Layer.provide(
                    PromptConfigLiveLayer,
                    Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson({}))
                );
                const accessConfig = Effect.gen(function* () {
                    return yield* PromptConfig;
                });
                return yield* Effect.provide(accessConfig, testLayer);
            });

            const result = await Effect.runPromiseExit(testEffect);
            Exit.match(result, {
                onFailure: (cause) => {
                    const error = Cause.failureOption(cause);
                    expect(Option.isSome(error)).toBe(true);
                    if (Option.isSome(error)) {
                        const err = error.value as PromptConfigError;
                        expect(err).toBeInstanceOf(PromptConfigError);
                        expect(err.message).toBe("Failed to load prompt config");
                    }
                },
                onSuccess: () => {
                    throw new Error("Expected failure but got success");
                }
            });
        });

        it("should fail with PromptConfigError if config fails schema validation", async () => {
            const testEffect = Effect.gen(function* () {
                const testLayer = createTestLayer({
                    prompts: [{
                        name: "invalid-prompt",
                        template: "",  // Add empty template to pass type check but fail schema validation
                    }]
                });
                const accessConfig = Effect.gen(function* () {
                    return yield* PromptConfig;
                });
                return yield* Effect.provide(accessConfig, testLayer);
            });

            const result = await Effect.runPromiseExit(testEffect);
            Exit.match(result, {
                onFailure: (cause) => {
                    const error = Cause.failureOption(cause);
                    expect(Option.isSome(error)).toBe(true);
                    if (Option.isSome(error)) {
                        const err = error.value as PromptConfigError;
                        expect(err).toBeInstanceOf(PromptConfigError);
                        expect(err.message).toBe("Failed to validate prompt config");
                    }
                },
                onSuccess: () => {
                    throw new Error("Expected failure but got success");
                }
            });
        });
    });

    describe("PromptApiLiveLayer", () => {
        it("should render a template string", async () => {
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                const result = yield* promptApi.renderString({
                    templateString: "Hello, {{name}}!",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello, World!");
                return result;
            });

            await Effect.runPromise(Effect.provide(testEffect, TestApiLayer));
        });

        it("should render a named template", async () => {
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                const result = yield* promptApi.renderTemplate({
                    templateName: "test-greeting",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello, World!");
                return result;
            });

            await Effect.runPromise(Effect.provide(testEffect, TestApiLayer));
        });

        it("should fail with TemplateNotFoundError for unknown template", async () => {
            const testEffect = Effect.gen(function* () {
                const promptApi = yield* PromptApi;
                return yield* promptApi.renderTemplate({
                    templateName: "non-existent",
                    context: { name: "World" }
                });
            });

            const result = await Effect.runPromiseExit(Effect.provide(testEffect, TestApiLayer));
            Exit.match(result, {
                onFailure: (cause) => {
                    const error = Cause.failureOption(cause);
                    expect(Option.isSome(error)).toBe(true);
                    if (Option.isSome(error)) {
                        const err = error.value as TemplateNotFoundError;
                        expect(err).toBeInstanceOf(TemplateNotFoundError);
                        expect(err.templateName).toBe("non-existent");
                    }
                },
                onSuccess: () => {
                    throw new Error("Expected template not found error");
                }
            });
        });
    });
});

// --- beforeAll/afterAll and test data definitions (copied for completeness) ---
// Note: These are defined globally above, no need to repeat here.
