/**
 * @file Tests for the main PromptApi service implementation.
 */

import { Cause, Context, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it, vi } from "vitest"; // Use standard vitest

import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
// Import types needed for mocking PromptConfiguration's R type
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/types.js";
import type { JsonObject } from "../../types.js"; // Import global type
import { PromptConfigurationError, PromptError, RenderingError, TemplateNotFoundError } from "../errors.js";
import { PromptApiLiveLayer } from "../main.js"; // Layer under test
import type { PromptDefinition } from "../schema.js"; // Import schema type
// Import service types, errors, implementation layer
import { PromptApi, PromptConfiguration } from "../types.js";


// --- Mock Dependencies ---

// Mock data for named templates
const mockTemplates: Readonly<Record<string, PromptDefinition>> = {
    "greeting": { name: "greeting", template: "Hello, {{name}}! Welcome to {{place}}." },
    "skill_prompt": { name: "skill_prompt", template: "System: {{persona.systemPrompt}}\nSkill: {{skill.description}}\nUser: {{input.query}}\nAssistant:" },
    "bad_template": { name: "bad_template", template: "Hello, {{ name }" }, // Malformed Liquid syntax
};

// Mock implementation for PromptConfiguration
// NOTE: The mock implementation itself doesn't NEED the R dependencies,
// but the LAYER providing it must satisfy the INTERFACE signature.
class MockPromptConfiguration implements PromptConfiguration {
    getPromptDefinitionByName = (name: string): Effect.Effect<PromptDefinition, TemplateNotFoundError | PromptConfigurationError> => { // R is implicitly never here
        if (mockTemplates[name]) {
            return Effect.succeed(mockTemplates[name]!);
        } else {
            // Return the specific error type expected by the interface signature
            return Effect.fail(new TemplateNotFoundError({ templateName: name }));
        }
    };
    listPromptDefinitions = (): Effect.Effect<ReadonlyArray<PromptDefinition>, PromptConfigurationError> => { // R is implicitly never here
        return Effect.succeed(Object.values(mockTemplates));
    };
}
// Layer providing the MOCK implementation for the PromptConfiguration TAG
const MockPromptConfigurationLayer = Layer.succeed(
    PromptConfiguration, // The Tag
    new MockPromptConfiguration() // The mock implementation
);

// --- Test Suite ---

describe("PromptApiLive", () => {

    // --- Test renderString ---

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

    // ... other renderString tests ...

    // --- Test renderTemplate ---

    // Define the layer needed for renderTemplate tests
    // It needs PromptApiLiveLayer + MockPromptConfigurationLayer
    // MockPromptConfigurationLayer provides PromptConfiguration, satisfying the R requirement of renderTemplate
    const RenderTemplateTestLayer = Layer.provide(
        PromptApiLiveLayer, // The service under test
        MockPromptConfigurationLayer // Provides the mocked dependency
    );

    it("renderTemplate should load and render a named template", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const context = { name: "Alice", place: "Wonderland" };
            // renderTemplate requires PromptConfiguration, provided by RenderTemplateTestLayer
            const result = yield* promptApi.renderTemplate({ templateName: "greeting", context });
            expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
        });

        // Provide the combined layer
        await Effect.runPromise(program.pipe(Effect.provide(RenderTemplateTestLayer)));
    });

    it("renderTemplate should render complex nested context", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const mockPersona = { systemPrompt: "Be concise." };
            const mockSkill = { description: "Summarize text." };
            const mockInput = { query: "Summarize the meeting notes." };
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

        const exit = await Effect.runPromise(Effect.exit(program.pipe(Effect.provide(RenderTemplateTestLayer))));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            // Expect TemplateNotFoundError from the mock config service
            expect(failureOption.value instanceof TemplateNotFoundError).toBe(true);
            expect((failureOption.value as TemplateNotFoundError).templateName).toBe("nonexistent_template");
        }
    });

    it("renderTemplate should fail with RenderingError if loaded template is invalid", async () => {
        const program = Effect.gen(function* () {
            const promptApi = yield* PromptApi;
            const context = { name: "Alice" };
            yield* promptApi.renderTemplate({ templateName: "bad_template", context });
        });

        const exit = await Effect.runPromise(Effect.exit(program.pipe(Effect.provide(RenderTemplateTestLayer))));

        expect(exit._tag).toBe("Failure");
        const failureOption = Exit.isFailure(exit) ? Cause.failureOption(exit.cause) : Option.none();
        expect(Option.isSome(failureOption)).toBe(true);
        if (Option.isSome(failureOption)) {
            // Expect RenderingError from the PromptApi service itself
            expect(failureOption.value instanceof RenderingError).toBe(true);
        }
    });

});
