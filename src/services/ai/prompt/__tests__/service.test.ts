import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { ConfigProvider, Effect, HashMap, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { RenderingError, TemplateNotFoundError } from "../../errors.js";
import { Prompt, PromptFile } from "../schema.js";
import { PromptService } from "../service.js";
import type { RenderStringParams, RenderTemplateParams } from "../types.js";

// Test data
const mockPrompts = [
    {
        name: "test-prompt",
        description: "A test prompt",
        template: "Hello {{ name }}!",
        metadata: {
            version: "1.0.0",
            tags: ["test"]
        }
    },
    {
        name: "complex-prompt",
        description: "A more complex prompt with conditionals",
        template: "{% if isAdmin %}Welcome Admin {{ name }}!{% else %}Welcome {{ name }}!{% endif %}",
        metadata: {
            version: "1.0.0",
            tags: ["test", "complex"]
        }
    },
    {
        name: "multi-variable",
        description: "A prompt with multiple variables",
        template: "{{ greeting }} {{ name }}! Your role is {{ role }} and your level is {{ level }}.",
        metadata: {
            version: "1.0.0",
            tags: ["test", "multi"]
        }
    },
    {
        name: "nested-objects",
        description: "A prompt with nested object access",
        template: "User {{ user.name }} ({{ user.id }}) has access level {{ user.access.level }}",
        metadata: {
            version: "1.0.0",
            tags: ["test", "nested"]
        }
    }
] as Prompt[];

const mockPromptFile: PromptFile = {
    name: "test-prompts",
    description: "Test prompt configurations",
    prompts: mockPrompts,
    metadata: {
        version: "1.0.0",
        tags: ["test"]
    }
};

describe("PromptService", () => {
    // Create test implementation
    const createTestImpl = () => {
        return Effect.gen(function* () {
            const configProvider = yield* ConfigProvider.ConfigProvider;
            const promptEntries = mockPrompts.map(
                (def): [string, Prompt] => [def.name, def]
            );
            const promptMap = HashMap.fromIterable(promptEntries);

            return {
                load: () => Effect.succeed(mockPromptFile),
                getPrompt: (name: string) => Effect.gen(function* () {
                    const prompt = HashMap.get(promptMap, name);
                    if (!Option.isSome(prompt)) {
                        return yield* Effect.fail(new TemplateNotFoundError(name));
                    }
                    return prompt.value;
                }),
                renderString: (params: RenderStringParams) => Effect.gen(function* () {
                    try {
                        // Simple template rendering simulation
                        let result = params.templateString;
                        for (const [key, value] of Object.entries(params.context)) {
                            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
                            result = result.replace(regex, String(value));
                        }
                        return result;
                    } catch (error) {
                        return yield* Effect.fail(new RenderingError({
                            message: "Failed to render template string",
                            cause: error instanceof Error ? error : new Error(String(error)),
                            templateSnippet: params.templateString.slice(0, 100)
                        }));
                    }
                }),
                renderTemplate: (params: RenderTemplateParams) => Effect.gen(function* () {
                    const prompt = HashMap.get(promptMap, params.templateName);
                    if (!Option.isSome(prompt)) {
                        return yield* Effect.fail(new TemplateNotFoundError(params.templateName));
                    }

                    try {
                        // Simple template rendering simulation
                        let result = prompt.value.template;
                        for (const [key, value] of Object.entries(params.context)) {
                            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
                            result = result.replace(regex, String(value));
                        }
                        return result;
                    } catch (error) {
                        return yield* Effect.fail(new RenderingError({
                            message: "Failed to render template",
                            cause: error instanceof Error ? error : new Error(String(error)),
                            templateName: params.templateName,
                            templateSnippet: prompt.value.template.slice(0, 100)
                        }));
                    }
                })
            };
        });
    };

    // Create test harness
    const harness = createServiceTestHarness(
        PromptService,
        createTestImpl
    );

    describe("load", () => {
        it("should load prompt configuration successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                const config = yield* service.load();
                expect(config).toEqual(mockPromptFile);
            });

            await harness.runTest(effect);
        });

        it("should handle invalid JSON config", async () => {
            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["prompts", "invalid json"]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "PromptConfigError"
            );
        });

        it("should validate prompt schema", async () => {
            const invalidConfig = {
                name: "invalid-prompts",
                prompts: [{
                    name: "invalid-prompt",
                    // Missing required template field
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([
                    ["prompts", JSON.stringify(invalidConfig)]
                ]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            });

            await harness.expectError(
                Effect.provide(effect, invalidConfigLayer),
                "PromptConfigError"
            );
        });
    });

    describe("getPrompt", () => {
        it("should retrieve a prompt by name", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const prompt = yield* service.getPrompt("test-prompt");
                expect(prompt).toEqual(mockPrompts[0]);
            });

            await harness.runTest(effect);
        });

        it("should fail with TemplateNotFoundError for invalid prompt name", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                yield* service.getPrompt("non-existent-prompt");
            });

            await harness.expectError(effect, "TemplateNotFoundError");
        });
    });

    describe("renderString", () => {
        it("should render a simple template string", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                const result = yield* service.renderString({
                    templateString: "Hello {{ name }}!",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello World!");
            });

            await harness.runTest(effect);
        });

        it("should handle multiple variables", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                const result = yield* service.renderString({
                    templateString: "{{ greeting }} {{ name }}!",
                    context: { greeting: "Hi", name: "User" }
                });
                expect(result).toBe("Hi User!");
            });

            await harness.runTest(effect);
        });

        it("should handle missing variables gracefully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.renderString({
                    templateString: "Hello {{ name }}!",
                    context: {}
                });
            });

            await harness.expectError(effect, "RenderingError");
        });

        it("should handle invalid template syntax", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.renderString({
                    templateString: "Hello {{ name !",
                    context: { name: "World" }
                });
            });

            await harness.expectError(effect, "RenderingError");
        });
    });

    describe("renderTemplate", () => {
        it("should render a stored template", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "test-prompt",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello World!");
            });

            await harness.runTest(effect);
        });

        it("should handle complex templates with conditionals", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "complex-prompt",
                    context: { name: "Admin", isAdmin: true }
                });
                expect(result).toBe("Welcome Admin Admin!");
            });

            await harness.runTest(effect);
        });

        it("should handle multiple variables in stored templates", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "multi-variable",
                    context: {
                        greeting: "Welcome",
                        name: "User",
                        role: "Admin",
                        level: 5
                    }
                });
                expect(result).toBe("Welcome User! Your role is Admin and your level is 5.");
            });

            await harness.runTest(effect);
        });

        it("should handle nested object access", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "nested-objects",
                    context: {
                        user: {
                            name: "John",
                            id: "123",
                            access: { level: "admin" }
                        }
                    }
                });
                expect(result).toBe("User John (123) has access level admin");
            });

            await harness.runTest(effect);
        });

        it("should fail with TemplateNotFoundError for non-existent template", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                yield* service.renderTemplate({
                    templateName: "non-existent",
                    context: { name: "World" }
                });
            });

            await harness.expectError(effect, "TemplateNotFoundError");
        });

        it("should fail with RenderingError for invalid context", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                yield* service.renderTemplate({
                    templateName: "test-prompt",
                    context: {} // Missing required 'name' variable
                });
            });

            await harness.expectError(effect, "RenderingError");
        });
    });
}); 