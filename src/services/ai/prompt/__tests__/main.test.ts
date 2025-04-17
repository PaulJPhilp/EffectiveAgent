import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
/**
 * @file Comprehensive tests for the PromptApi service implementation.
 */
import { describe, expect, it } from "vitest";
import { PromptConfigError, RenderingError, TemplateNotFoundError } from "../errors.js";
import { PromptService } from "../service.js";


// --- Mock Data ---
const validPromptConfig = {
    description: "Test prompt config",
    name: "test-prompt-config",
    prompts: [
        { name: "greeting", template: "Hello, {{name}}! Welcome to {{place}}." },
        { name: "bad", template: "Hello, {{ name }" }
    ]
};

// --- Tests ---
describe("PromptApi", () => {
    const validConfigLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["prompts", JSON.stringify(validPromptConfig)]
        ]))
    );
    const layer = PromptService.Default;

    it("renderTemplate returns rendered string for valid template", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            const result = yield* api.renderTemplate({ templateName: "greeting", context: { name: "Alice", place: "Wonderland" } });
            expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });

    it("renderTemplate fails with TemplateNotFoundError for missing template", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            yield* api.renderTemplate({ templateName: "missing", context: {} });
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const err = Cause.failureOption(exit.cause);
            expect(Option.isSome(err)).toBe(true);
            expect(Option.getOrThrow(err)).toBeInstanceOf(TemplateNotFoundError);
        }
    });

    it("renderTemplate fails with RenderingError for invalid template syntax", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            yield* api.renderTemplate({ templateName: "bad", context: { name: "Bob" } });
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const err = Cause.failureOption(exit.cause);
            expect(Option.isSome(err)).toBe(true);
            expect(Option.getOrThrow(err)).toBeInstanceOf(RenderingError);
        }
    });

    it("renderString returns rendered string for valid template string", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            const result = yield* api.renderString({ templateString: "Hi, {{name}}!", context: { name: "Eve" } });
            expect(result).toBe("Hi, Eve!");
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });

    it("renderString fails with RenderingError for invalid template string", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            yield* api.renderString({ templateString: "Hello, {{ name }", context: { name: "X" } });
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromise(Effect.exit(provided));
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const err = Cause.failureOption(exit.cause);
            expect(Option.isSome(err)).toBe(true);
            expect(Option.getOrThrow(err)).toBeInstanceOf(RenderingError);
        }
    });

    it("renderTemplate handles missing context variables gracefully", async () => {
        const effect = Effect.gen(function* () {
            const apiService = yield* PromptService;
            yield* apiService.load();
            const api = yield* PromptService;
            const result = yield* api.renderTemplate({ templateName: "greeting", context: {} });
            expect(result).toBe("Hello, ! Welcome to .");
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });
});
