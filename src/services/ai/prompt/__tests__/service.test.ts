import { Effect } from "effect";
import { PromptService } from "../service.js";
import { ConfigProvider } from "../../config/provider.js";
import type { RenderStringParams, RenderTemplateParams } from "../types.js";
import type { PromptFile } from "../schema.js";
import { describe, expect, it } from "vitest";
import { RenderingError, TemplateNotFoundError } from "../../errors.js";

// Direct service reference - no Layer usage
const TestPromptService = PromptService;

describe("PromptService", () => {
    const mockPromptFile: PromptFile = {
        name: "test-prompts",
        prompts: [
            {
                name: "test-prompt",
                description: "A test prompt",
                template: "Hello {{ name }}!"
            },
            {
                name: "multi-variable",
                description: "A prompt with multiple variables",
                template: "{{ greeting }} {{ name }}! Your role is {{ role }} and your level is {{ level }}."
            },
            {
                name: "nested-objects",
                description: "A prompt with nested objects",
                template: "User {{ user.name }} ({{ user.id }}) has access level {{ user.access.level }}"
            },
            {
                name: "complex-prompt",
                description: "A prompt with conditionals",
                template: "Welcome {{ name }}{% if isAdmin %} Admin{% endif %}!"
            }
        ]
    };

    describe("PromptService", () => {
        // Create service instance for each test
        describe("load", () => {
            it("should load prompt configuration successfully", () => Effect.gen(function* () {
                const service = yield* TestPromptService;
                const result = yield* service.load();
                expect(result).toBeDefined();
            }));

            // Note: Invalid JSON config is handled by ConfigProvider

            // Note: Schema validation is handled internally by the service
        });

        describe("getPrompt", () => {
            it("should retrieve prompt by name", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const prompt = yield* service.getPrompt("test-prompt");
                expect(prompt).toEqual(mockPrompts[0]);
            }));

            it("should handle missing prompt", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            
                try {
                    yield* service.getPrompt("non-existent");
                    expect(true).toBe(false); // Should not reach here
                } catch (e: any) {
                    expect(e.name).toBe("TemplateNotFoundError");
                }
            }));
        });

        describe("renderString", () => {
            it("should render template string with variables", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderString({
                    templateString: "Hello {{ name }}!",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello World!");
            }));

            it("should handle multiple variables", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderString({
                    templateString: "{{ greeting }} {{ name }}!",
                    context: { greeting: "Hi", name: "User" }
                });
                expect(result).toBe("Hi User!");
            }));

            it("should handle missing variables", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            
                try {
                    yield* service.renderString({
                        templateString: "Hello {{ name }}!",
                        context: {}
                    });
                    expect(true).toBe(false); // Should not reach here
                } catch (e: any) {
                    expect(e.name).toBe("RenderingError");
                }
            }));

            it("should handle invalid template syntax", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            
                try {
                    yield* service.renderString({
                        templateString: "Hello {{ name !",
                        context: { name: "World" }
                    });
                    expect(true).toBe(false); // Should not reach here
                } catch (e: any) {
                    expect(e.name).toBe("RenderingError");
                }
            }));
        });

        describe("renderTemplate", () => {
            it("should render a stored template", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "test-prompt",
                    context: { name: "World" }
                });
                expect(result).toBe("Hello World!");
            }));

            it("should handle complex templates with conditionals", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* service.renderTemplate({
                    templateName: "complex-prompt",
                    context: { name: "Admin", isAdmin: true }
                });
                expect(result).toBe("Welcome Admin Admin!");
            }));

            it("should handle multiple variables in stored templates", () => Effect.gen(function* () {
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
            }));

            it("should handle multiple variables in stored templates", () => Effect.gen(function* () {
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
            }));

            it("should handle nested object access", () => Effect.gen(function* () {
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
            }));

            it("should handle missing template", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
            
                try {
                    yield* service.renderTemplate({
                        templateName: "non-existent",
                        context: { name: "World" }
                    });
                    expect(true).toBe(false); // Should not reach here
                } catch (e: any) {
                    expect(e.name).toBe("TemplateNotFoundError");
                }
            }));

            it("should fail with RenderingError for invalid context", () => Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                try {
                    yield* service.renderTemplate({
                        templateName: "test-prompt",
                        context: {} // Missing required 'name' variable
                    });
                    expect(true).toBe(false); // Should not reach here
                } catch (e: any) {
                    expect(e.name).toBe("RenderingError");
                }
            }));
        });
    });
});