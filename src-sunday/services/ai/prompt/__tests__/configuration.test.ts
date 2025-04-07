/**
 * @file Tests for the PromptConfiguration service implementation.
 */

import { Effect, Layer, Exit, Cause, Option, Context, DefaultServices } from "effect";
import { describe, expect, it, vi } from "vitest"; // Use standard vitest

// Import service types, errors, implementation layer
import { PromptConfiguration } from "../types.js"; // Import the Tag
import { PromptConfigurationLiveLayer } from "../configuration.js"; // Import the Layer under test
import { TemplateNotFoundError, PromptConfigurationError } from "../errors.js";
import type { PromptDefinition, PromptsConfig } from "../schema.js"; // Import schema types

// Import dependencies that need mocking or providing
import { ConfigLoaderApi, ConfigLoaderOptions } from "@/services/core/configuration/index.js";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";

// --- Mock Data ---
const mockPrompt1: PromptDefinition = { name: "greeting", template: "Hello, {{name}}!" };
const mockPrompt2: PromptDefinition = { name: "farewell", template: "Goodbye, {{name}}." };
const mockPromptsConfig: PromptsConfig = {
    prompts: [mockPrompt1, mockPrompt2]
};
const mockLoadedConfig = { // Shape after processing in loadPromptsConfigEffect
    prompts: {
        [mockPrompt1.name]: mockPrompt1,
        [mockPrompt2.name]: mockPrompt2,
    }
};

// --- Mock ConfigLoaderApi Layer ---
// Create a layer that provides a mock implementation for ConfigLoaderApi
const createMockConfigLoaderLayer = (
    configToLoad: Effect.Effect<any, PromptConfigurationError> // Effect resolves to config data or fails
) => {
    const mockLoader: ConfigLoaderApi = {
        // Mock loadConfig to return the specified effect
        loadConfig: (filename: string, options: any) => {
            if (filename === "prompts.json") { // Only mock the expected file
                // We ignore the schema validation here for simplicity, assuming success path returns mockPromptsConfig
                // For failure tests, configToLoad would be Effect.fail(...)
                return configToLoad;
            }
            return Effect.fail(new Error(`MockConfigLoader unexpected file: ${filename}`));
        }
    };
    return Layer.succeed(ConfigLoaderApi, mockLoader);
};

// --- Base Layers Needed by ConfigLoader ---
// These are needed because PromptConfigurationLiveLayer requires ConfigLoaderApi + FS + Path + Options
const PlatformLayer = Layer.succeedContext(DefaultServices.liveServices); // Provides FS, Path, Clock
const MockConfigOptionsLayer = Layer.succeed(ConfigLoaderOptions, { basePath: "/mock/path" }); // Mock options

// --- Test Suite ---
describe("PromptConfigurationLiveLayer", () => {

    it("getPromptDefinitionByName should return a found template", async () => {
        // Mock ConfigLoader to succeed with mock data
        const MockLoaderLayer = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));

        // Compose the final layer for the test
        const TestLayer = PromptConfigurationLiveLayer.pipe(
            Layer.provide(MockLoaderLayer), // Provide mock ConfigLoader
            Layer.provide(MockConfigOptionsLayer), // Provide mock Options needed by R type
            Layer.provide(PlatformLayer) // Provide platform needed by R type
        );

        const program = Effect.gen(function* () {
            const configService = yield* PromptConfiguration;
            const promptDef = yield* configService.getPromptDefinitionByName("greeting");
            expect(promptDef).toEqual(mockPrompt1);
        });

        await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it("getPromptDefinitionByName should fail with TemplateNotFoundError for unknown name", async () => {
        // Mock ConfigLoader to succeed with mock data
        const MockLoaderLayer = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));

        const TestLayer = PromptConfigurationLiveLayer.pipe(
            Layer.provide(MockLoaderLayer),
            Layer.provide(MockConfigOptionsLayer),
            Layer.provide(PlatformLayer)
        );

        const program = Effect.gen(function* () {
            const configService = yield* PromptConfiguration;
            // Try to get a template that doesn't exist in mockPromptsConfig
            yield* configService.getPromptDefinitionByName("unknown_template");
        });

        const exit = await Effect.runPromise(Effect.exit(program.pipe(Effect.provide(TestLayer))));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            expect(failureOption.value instanceof TemplateNotFoundError).toBe(true);
            expect((failureOption.value as TemplateNotFoundError).templateName).toBe("unknown_template");
        }
    });

    it("listPromptDefinitions should return all loaded templates", async () => {
        const MockLoaderLayer = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));
        const TestLayer = PromptConfigurationLiveLayer.pipe(
            Layer.provide(MockLoaderLayer),
            Layer.provide(MockConfigOptionsLayer),
            Layer.provide(PlatformLayer)
        );

        const program = Effect.gen(function* () {
            const configService = yield* PromptConfiguration;
            const allDefs = yield* configService.listPromptDefinitions();
            // Check array contents (order might not be guaranteed depending on Record.values)
            expect(allDefs).toHaveLength(2);
            expect(allDefs).toContainEqual(mockPrompt1);
            expect(allDefs).toContainEqual(mockPrompt2);
        });

        await Effect.runPromise(program.pipe(Effect.provide(TestLayer)));
    });

    it("should fail with PromptConfigurationError if ConfigLoader fails", async () => {
        // Mock ConfigLoader to fail
        const underlyingError = new Error("Disk read error");
        const MockLoaderLayer = createMockConfigLoaderLayer(Effect.fail(underlyingError)); // Mock loader fails

        const TestLayer = PromptConfigurationLiveLayer.pipe(
            Layer.provide(MockLoaderLayer),
            Layer.provide(MockConfigOptionsLayer),
            Layer.provide(PlatformLayer)
        );

        // Try to use any method, it should fail during loading
        const program = Effect.gen(function* () {
            const configService = yield* PromptConfiguration;
            yield* configService.listPromptDefinitions();
        });

        const exit = await Effect.runPromise(Effect.exit(program.pipe(Effect.provide(TestLayer))));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            // Expect PromptConfigurationError wrapping the underlying error
            expect(failureOption.value instanceof PromptConfigurationError).toBe(true);
            expect((failureOption.value as PromptConfigurationError).message).toContain("Failed to load or parse prompts.json");
            expect((failureOption.value as PromptConfigurationError).cause).toBe(underlyingError);
        }
    });

});
