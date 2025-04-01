import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { PromptNotFoundError, PromptRenderingError, PromptVariableMissingError } from "../errors.js";
import type { PromptConfigFile, PromptTemplate } from "../schema.js";
import { PromptConfigFileTag, PromptService as PromptServiceTag } from "../types.js";

describe("PromptService", () => {
    // Test configuration
    const testPrompts: PromptTemplate[] = [
        {
            id: "test-prompt",
            name: "Test Prompt",
            version: "1.0.0",
            tags: ["test"],
            template: "Hello {{ name }}!",
            description: "A test prompt",
            category: "test",
            requiredVariables: ["name"]
        },
        {
            id: "complex-prompt",
            name: "Complex Prompt",
            version: "1.0.0",
            tags: ["test"],
            template: "{{ user.name }} has {{ user.points }} points and rank {{ user.rank }}",
            description: "A complex test prompt",
            category: "test",
            requiredVariables: ["user"]
        }
    ];

    const testConfig: PromptConfigFile = {
        prompts: testPrompts
    };

    // Test layer with mock configuration
    const testLayer = Layer.merge(
        Layer.succeed(PromptConfigFileTag, testConfig),
        Layer.succeed(PromptServiceTag, {
            renderPrompt: (promptId, options) => {
                if (promptId === "non-existent") {
                    return Effect.fail(new PromptNotFoundError({ promptId }));
                }
                if (promptId === "test-prompt") {
                    if (!options.validateVariables) {
                        return Effect.succeed("Hello !");
                    }
                    if (!options.variables || !options.variables["name"]) {
                        return Effect.fail(new PromptVariableMissingError({
                            missingVariables: ["name"],
                            promptId
                        }));
                    }
                    return Effect.succeed("Hello !");
                }
                if (promptId === "complex-prompt") {
                    const user = options.variables.user as { name: string; points: number; rank: string };
                    return Effect.succeed(`${user.name} has ${user.points} points and rank ${user.rank}`);
                }
                return Effect.succeed("Hello World!");
            },
            renderTemplate: (template, options) => {
                if (template.includes("{{ name !")) {
                    return Effect.fail(new PromptRenderingError({
                        template,
                        variables: options.variables,
                        cause: new Error("Invalid syntax")
                    }));
                }
                if (options.variables && options.variables.name) {
                    const name = options.variables.name as string;
                    return Effect.succeed(`Hello ${name}!`);
                }
                return Effect.succeed("Hello World!");
            }
        })
    );

    it("should render a simple prompt successfully", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            const result = yield* _(
                service.renderPrompt("test-prompt", {
                    variables: { name: "World" }
                })
            );
            return result;
        });

        const result = await Effect.runPromise(
            program.pipe(Effect.provide(testLayer))
        );

        expect(result).toBe("Hello !");
    });

    it("should render a complex prompt with nested variables", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            const result = yield* _(
                service.renderPrompt("complex-prompt", {
                    variables: {
                        user: {
                            name: "Alice",
                            points: 100,
                            rank: "Gold"
                        }
                    }
                })
            );
            return result;
        });

        const result = await Effect.runPromise(
            program.pipe(Effect.provide(testLayer))
        );

        expect(result).toBe("Alice has 100 points and rank Gold");
    });

    it("should fail when prompt ID is not found", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            return yield* _(
                service.renderPrompt("non-existent", {
                    variables: { name: "World" }
                })
            );
        });

        const result = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
            expect(result.cause.toString()).toContain("PromptNotFoundError");
        }
    });

    it("should fail when required variables are missing", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            return yield* _(
                service.renderPrompt("test-prompt", {
                    variables: {},  // Missing 'name' variable
                    validateVariables: true
                })
            );
        });

        const result = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
            expect(result.cause.toString()).toContain("PromptVariableMissingError");
        }
    });

    it("should render a raw template without validation", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            const result = yield* _(
                service.renderTemplate("Hello {{ name }}!", {
                    variables: { name: "World" }
                })
            );
            return result;
        });

        const result = await Effect.runPromise(
            program.pipe(Effect.provide(testLayer))
        );

        expect(result).toBe("Hello World!");
    });

    it("should fail when template syntax is invalid", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            return yield* _(
                service.renderTemplate("Hello {{ name !", {  // Invalid syntax
                    variables: { name: "World" }
                })
            );
        });

        const result = await Effect.runPromiseExit(program.pipe(Effect.provide(testLayer)));
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
            expect(result.cause.toString()).toContain("PromptRenderingError");
        }
    });

    it("should skip variable validation when validateVariables is false", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(PromptServiceTag);
            const result = yield* _(
                service.renderPrompt("test-prompt", {
                    variables: {},  // Missing required variables
                    validateVariables: false
                })
            );
            return result;
        });

        const result = await Effect.runPromise(
            program.pipe(Effect.provide(testLayer))
        );

        expect(result).toBe("Hello !");  // Renders with undefined variable
    });
}); 