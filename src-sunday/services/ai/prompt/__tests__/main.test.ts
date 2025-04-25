/**
 * @file Tests for the main PromptApi service implementation.
 */

import { Cause, Context, DefaultServices, Effect, Exit, Layer, Option } from "effect";
// Use standard vitest functions
import { describe, expect, it, vi } from "vitest";

import type { JsonObject } from "../../../types.js"; // Import global type
import { PromptConfigurationError, PromptError, RenderingError, TemplateNotFoundError } from "../errors.js";
import { PromptApiLive, PromptApiLiveLayer } from "../main.js"; // Layer under test
import type { PromptDefinition, PromptsConfig } from "../schema.js"; // Import schema types
// Import service types, errors, implementation layer
import { PromptApi, PromptConfiguration } from "../types.js";

import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "../../../core/configuration/errors.js"; // Import ConfigLoader errors
// Import dependencies that need mocking or providing
import { ConfigLoaderApi, ConfigLoaderApiLive, ConfigLoaderApiLiveLayer, ConfigLoaderOptions, ConfigLoaderOptionsLayer, ConfigLoaderOptionsLayerLayer, ConfigLoaderOptionsLiveLayer } from "../../../core/configuration/index.js"; // Import ConfigLoader types

import type { SkillDefinition } from "../../../capabilities/skill/types.js";
// Import example types for context data
import type { Persona } from "../../../core/persona/types.js";
import { PromptConfigurationLiveLayer } from "../configuration.js";


// --- Mock Data ---
// Ensure mockTemplates definition is present
const mockTemplates: Readonly<Record<string, PromptDefinition>> = {
    "greeting": { name: "greeting", template: "Hello, {{name}}! Welcome to {{place}}." },
    "skill_prompt": { name: "skill_prompt", template: "System: {{persona.systemPrompt}}\nSkill: {{skill.description}}\nUser: {{input.query}}\nAssistant:" },
    "bad_template": { name: "bad_template", template: "Hello, {{ name }" }, // Malformed Liquid syntax
};
const mockPromptsConfig: PromptsConfig = {
    prompts: Object.values(mockTemplates) // Use values from mockTemplates
};
// Define bad template separately if needed for specific mock return
const badTemplateDef: PromptDefinition = mockTemplates["bad_template"]!;


// --- Mock ConfigLoaderApi Layer Factory ---
// Creates a layer that provides a mock implementation for ConfigLoaderApi
const createMockConfigLoaderLayer = (
    // configToLoad should resolve to PromptsConfig or fail with a ConfigLoader error type
    configToLoad: Effect.Effect<PromptsConfig, ConfigReadError | ConfigParseError | ConfigValidationError>
) => {
    const mockLoader: ConfigLoaderApi = {
        // Ensure the mock signature matches the interface closely
        loadConfig: <T>(
            filename: string,
            options: { schema: z.ZodType<T> } // Match LoadConfigOptions structure
        ): Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError> => { // Match E type
            if (filename === "prompts.json") {
                // We assume schema matches PromptsConfigSchema for this mock path
                // Cast needed because configToLoad is specific, but method is generic
                return configToLoad as Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError>;
            }
            // Fail with a specific, assignable error type
            return Effect.fail(new ConfigReadError({
                filePath: filename,
                message: `MockConfigLoader received unexpected file request: ${filename}`
            }));
        }
    };
    // Layer provides the mock implementation for the ConfigLoaderApi Tag
    return Layer.succeed(ConfigLoaderApi, mockLoader);
};


// --- Mock PromptConfiguration Layer ---
// (Uses mock data directly, doesn't need ConfigLoader)
class MockPromptConfiguration implements PromptConfiguration {
    getPromptDefinitionByName = (name: string): Effect.Effect<PromptDefinition, TemplateNotFoundError | PromptConfigurationError> => {
        if (mockTemplates[name]) {
            return Effect.succeed(mockTemplates[name]!);
        } else if (name === badTemplateDef.name) { // Allow fetching the bad template
            return Effect.succeed(badTemplateDef);
        } else {
            return Effect.fail(new TemplateNotFoundError({ templateName: name }));
        }
    };
    listPromptDefinitions = (): Effect.Effect<ReadonlyArray<PromptDefinition>, PromptConfigurationError> => {
        return Effect.succeed(Object.values(mockTemplates)); // Return array of definitions
    };
}
const MockPromptConfigurationLayer = Layer.succeed(PromptConfiguration, new MockPromptConfiguration());


// --- Base Layers Needed by Dependencies ---
// Define these once for reuse
const PlatformLayer = Layer.succeedContext(DefaultServices.liveServices); // Provides FS, Path, Clock
const MockConfigOptionsLayer = Layer.succeed(ConfigLoaderOptions, { basePath: "/mock/path" }); // Mock options needed by ConfigLoaderLayer R type
// Mock ConfigLoader Layer that succeeds (used in most renderTemplate tests)
const MockLoaderLayer_Success = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));
// Layer providing ConfigLoaderApi + Options + Platform (needed by PromptConfiguration R type)
const ConfigLoaderDepsLayer = Layer.mergeAll(MockLoaderLayer_Success, MockConfigOptionsLayer, PlatformLayer);


// --- Test Suite ---
describe("PromptApiLive", () => {


    // Mock ConfigLoader that succeeds
    const MockLoaderLayer_Success = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));
    // Mock PromptConfiguration implementation instance
    const mockPromptConfigService = new MockPromptConfiguration();

    it("renderString should render a valid template string with context", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const template = "Order for {{customer.name}}: {{items.length}} items.";
            const context = { customer: { name: "Bob" }, items: ["apple", "banana"] };
            const result = yield* promptApi.renderString({ templateString: template, context });
            expect(result).toBe("Order for Bob: 2 items.");
        });
        // Provide only the live PromptApi layer (renderString has R=never)
        await Effect.runPromise(program.pipe(Effect.provide(PromptApiLiveLayer)));
    });

    it("renderString should fail with RenderingError for invalid template syntax", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const template = "Hello, {{ name }"; // Missing closing braces
            const context = { name: "Alice" };
            yield* promptApi.renderString({ templateString: template, context });
        });
        const exit = await Effect.runPromise(Effect.exit(program.pipe(Effect.provide(PromptApiLiveLayer))));
        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            expect(failureOption.value instanceof RenderingError).toBe(true);
        }
    });

    it("renderString should render correctly with missing context variables (Liquid default)", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const template = "Hello, {{name | default: 'guest'}}!"; // Use Liquid default filter
            const context = {}; // Missing name
            const result = yield* promptApi.renderString({ templateString: template, context });
            expect(result).toBe("Hello, guest!");
        });
        await Effect.runPromise(program.pipe(Effect.provide(PromptApiLiveLayer)));
    });

    // --- Test renderTemplate ---

    // Define the layer needed for renderTemplate tests
    // It needs PromptApiLiveLayer + MockPromptConfigurationLayer
    // AND the dependencies declared in PromptConfiguration's R signature
    const RenderTemplateTestLayer = PromptApiLiveLayer.pipe(
        Layer.provide(MockPromptConfigurationLayer), // Provides the mock PromptConfiguration
        // Provide the transitive dependencies required by PromptConfiguration's interface signature
        Layer.provide(ConfigLoaderDepsLayer) // Provides ConfigLoaderApi, FS, Path, Options, Platform
    );

    it("renderTemplate should load and render a named template", async () => {
        // --- Define Mocks and Base Layers ---
        const MockLoaderLayer_Success = createMockConfigLoaderLayer(Effect.succeed(mockPromptsConfig));
        const mockPromptConfigService = new MockPromptConfiguration(); // Instance, not layer
        const PlatformLayer = Layer.succeedContext(DefaultServices.liveServices);
        const MockConfigOptionsLayer = Layer.succeed(ConfigLoaderOptions, { basePath: "/mock/path" });

        // --- Compose the FINAL Test Layer ---
        const RenderTemplateTestLayer = PromptApiLiveLayer.pipe( // Start with the service under test
            // Provide its direct dependencies
            Layer.provide(Layer.succeed(PromptConfiguration, mockPromptConfigService)), // Provide mock service instance via Layer.succeed
            // Provide ALL transitive dependencies declared in signatures
            Layer.provide(MockLoaderLayer_Success),   // Provides ConfigLoaderApi
            Layer.provide(MockConfigOptionsLayer),  // Provides ConfigLoaderOptions
            Layer.provide(PlatformLayer)            // Provides FileSystem, Path
        );

        // --- Define the Program ---
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const context = { name: "Alice", place: "Wonderland" };
            const result = yield* promptApi.renderTemplate({ templateName: "greeting", context });
            expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
        });

        // --- Provide the single composed layer ---
        // The R type of runnableEffect should now be 'never'
        const runnableEffect = program.pipe(
            Effect.provide(RenderTemplateTestLayer)
        );

        await Effect.runPromise(runnableEffect);
    });


    it("renderTemplate should render complex nested context", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const mockPersona: Partial<Persona> = { systemPrompt: "Be concise." };
            const mockSkill: Partial<SkillDefinition> = { description: "Summarize text." };
            const mockInput: JsonObject = { query: "Summarize the meeting notes." };
            const context = { persona: mockPersona, skill: mockSkill, input: mockInput };

            const result = yield* promptApi.renderTemplate({ templateName: "skill_prompt", context });
            expect(result).toBe("System: Be concise.\nSkill: Summarize text.\nUser: {\"query\":\"Summarize the meeting notes.\"}\nAssistant:");
        });

        await Effect.runPromise(program.pipe(Effect.provide(RenderTemplateTestLayer)));
    });


    it("renderTemplate should fail with TemplateNotFoundError if template name doesn't exist", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const context = { name: "Alice" };
            yield* promptApi.renderTemplate({ templateName: "nonexistent_template", context });
        });

        // The R type should now be 'never' after providing RenderTemplateTestLayer
        const exit = await Effect.runPromise(Effect.exit(
            program.pipe(Effect.provide(RenderTemplateTestLayer))
        ));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            expect(failureOption.value instanceof TemplateNotFoundError).toBe(true);
            // Check specific property if TemplateNotFoundError defines it
            expect((failureOption.value as TemplateNotFoundError).message).toBe("Template 'nonexistent_template' not found");
        }
    });

    it("renderTemplate should fail with RenderingError if loaded template is invalid", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const context = { name: "Alice" };
            // Use the mock config that loads the bad template definition
            yield* promptApi.renderTemplate({ templateName: "bad_template", context });
        });

        // The R type should now be 'never' after providing RenderTemplateTestLayer
        const exit = await Effect.runPromise(Effect.exit(
            program.pipe(Effect.provide(RenderTemplateTestLayer))
        ));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            expect(failureOption.value instanceof RenderingError).toBe(true);
        }
    });

    // Test case where PromptConfiguration itself fails (due to ConfigLoader failure)
    it("renderTemplate should fail with PromptConfigurationError if config loading fails", async () => {
        const underlyingError = new ConfigReadError({ filePath: "prompts.json", message: "Disk read error" });
        const MockLoaderLayer_Failure = createMockConfigLoaderLayer(Effect.fail(underlyingError));

        // --- Explicitly Merge ALL Dependencies for PromptConfiguration ---
        // These are the layers needed to satisfy the R type of PromptConfiguration methods
        const PromptConfigDepsLayer = Layer.mergeAll(
            MockLoaderLayer_Failure,    // Provides ConfigLoaderApi (failing)
            MockConfigOptionsLayer,   // Provides ConfigLoaderOptions
            PlatformLayer             // Provides FileSystem, Path
        );

        const TestLayer = PromptApiLiveLayer.pipe(
            Layer.provide(MockPromptConfigurationLayer),
            Layer.provide(PromptConfigDepsLayer)
        );

        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            yield* promptApi.renderTemplate({ templateName: "greeting", context: {} });
        });

        const runnableEffect = program.pipe(
            Effect.provide(TestLayer)
        );

        const exit = await Effect.runPromise(Effect.exit(runnableEffect));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            // Expect PromptConfigurationError wrapping the ConfigReadError
            expect(failureOption.value instanceof PromptConfigurationError).toBe(true);
            expect((failureOption.value as PromptConfigurationError).cause).toBe(underlyingError);
        }
    });

});
