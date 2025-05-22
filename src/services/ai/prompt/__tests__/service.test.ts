import { ConfigurationServiceApi, LoadConfigOptions } from "@/services/core/configuration/api.js";
import { BaseConfig } from "@/services/core/configuration/schema.js";
import {
    ConfigParseError,
    ConfigReadError,
    ConfigValidationError,
} from "@/services/core/configuration/errors.js";
import {
    ConfigurationService,
} from "@/services/core/configuration/service.js";
import { ConfigProvider, Effect, Either, Layer, ParseResult, Schema as S } from "effect";
import { describe, expect, it, vi } from "vitest";
import { PromptConfigError, RenderingError, TemplateNotFoundError } from "../../errors.js";
import { Prompt, PromptFile } from "../schema.js";
import { PromptService } from "../service.js";

const PROMPT_FILE_PATH = "./config/prompts.json";
const PROMPTS_CONFIG_PATH_KEY = "PROMPT_SERVICE_PROMPT_FILE_PATH";

const examplePromptFile: PromptFile = {
    name: "Test Prompts",
    version: "1.0.0",
    prompts: [
        {
            name: "TestPrompt1",
            description: "A test prompt",
            template: "Hello, {{name}}!"
        }
    ]
};

// Helper to create a ParseError instance for mocking
const createMockParseError = (error: ParseResult.ParseIssue): ParseResult.ParseError => {
    return ParseResult.parseError(error);
};

describe("PromptService", () => {
    // Use a simple mock function approach that works better with TypeScript
    const mockLoadConfig = vi.fn();
    
    // Type assertion for better IDE support without causing type errors
    type LoadConfigFn = ConfigurationServiceApi["loadConfig"];

    const MockConfigurationService = ConfigurationService.of({
        loadConfig: mockLoadConfig,
        // Add the remaining required methods from the API with no-op implementations
        // since PromptService only uses loadConfig
        readFile: vi.fn().mockImplementation(() => Effect.succeed("")),
        parseJson: vi.fn().mockImplementation(() => Effect.succeed({})),
        validateWithSchema: vi.fn().mockImplementation(() => Effect.succeed({}))
    });
    const MockConfigurationServiceLayer = Layer.succeed(ConfigurationService, MockConfigurationService);

    const testConfigProviderLayer = ConfigProvider.fromMap(
        new Map([[PROMPTS_CONFIG_PATH_KEY, PROMPT_FILE_PATH]])
    );

    const createTestLayer = (
        mockConfigImpl?: (
            params: Parameters<ConfigurationServiceApi["loadConfig"]>[0]
        ) => ReturnType<ConfigurationServiceApi["loadConfig"]>
    ) => {
        if (mockConfigImpl) {
            mockLoadConfig.mockImplementation(mockConfigImpl);
        } else {
            // Default mock implementation if none provided
            mockLoadConfig.mockReturnValue(Effect.succeed(examplePromptFile as any)); // Cast as any to satisfy schema type in mock
        }
        return PromptService.Default.pipe(
            Layer.provide(MockConfigurationServiceLayer),
            Layer.provide(Layer.setConfigProvider(testConfigProviderLayer))
        );
    }

    it("load: should load prompt configuration successfully", () =>
        Effect.gen(function* () {
            const service = yield* PromptService;
            const result = yield* service.load();
            expect(result.prompts.length).toBe(1);
            expect(result.prompts[0]?.name).toBe("TestPrompt1");
            expect(result.version).toBe("1.0.0");
        }).pipe(Effect.provide(createTestLayer()))
    );

    it("load: should handle ConfigReadError from loadConfig", () =>
        Effect.gen(function* () {
            const readError = new ConfigReadError({ filePath: PROMPT_FILE_PATH, cause: "permission denied" });
            const layer = createTestLayer(() => Effect.fail(readError));

            const service = yield* PromptService;
            const result = yield* Effect.either(service.load());

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(PromptConfigError);
                expect(result.left.cause).toBe(readError);
                expect(result.left.description).toContain(PROMPT_FILE_PATH);
            }
        }).pipe(Effect.provide(createTestLayer(() =>
            Effect.fail(new ConfigReadError({ filePath: PROMPT_FILE_PATH, cause: "test read error" }))
        )))
    );

    it("load: should handle ConfigParseError from loadConfig", () =>
        Effect.gen(function* () {
            const parseError = new ConfigParseError({ filePath: PROMPT_FILE_PATH, cause: "invalid json" });
            const layer = createTestLayer(() => Effect.fail(parseError));

            const service = yield* PromptService;
            const result = yield* Effect.either(service.load());

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(PromptConfigError);
                expect(result.left.cause).toBe(parseError);
            }
        }).pipe(Effect.provide(createTestLayer(() =>
            Effect.fail(new ConfigParseError({ filePath: PROMPT_FILE_PATH, cause: "test parse error" }))
        )))
    );

    it("load: should handle ConfigValidationError from loadConfig", () =>
        Effect.gen(function* () {
            // Create a simplified mock ParseError for testing purposes
            // Using two-step type assertion as recommended by TypeScript
            const mockPe = createMockParseError({
                _tag: "Pointer",
                path: ["prompts"],
                issue: { _tag: "Missing", ast: { type: "array" }, actual: undefined },
                actual: undefined // Required by Pointer type
            } as unknown as ParseResult.ParseIssue);
            const validationError = new ConfigValidationError({
                filePath: PROMPT_FILE_PATH,
                validationError: mockPe
            });
            const layer = createTestLayer(() => Effect.fail(validationError));

            const service = yield* PromptService;
            const result = yield* Effect.either(service.load());

            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(PromptConfigError);
                expect(result.left.cause).toBe(validationError);
            }
        }).pipe(Effect.provide(createTestLayer(() => {
            // Create a simplified mock ParseError for testing purposes
            // Using two-step type assertion as recommended by TypeScript
            const pe = createMockParseError({
                _tag: "Type", 
                ast: { type: "string" },
                actual: 123
            } as unknown as ParseResult.ParseIssue);
            return Effect.fail(new ConfigValidationError({ filePath: PROMPT_FILE_PATH, validationError: pe }));
        })))
    );


    describe("getPrompt", () => {
        it("should retrieve prompt by name after loading", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const prompt = yield* service.getPrompt("TestPrompt1");
                expect(prompt.name).toBe("TestPrompt1");
                expect(prompt.template).toBe("Hello, {{name}}!");
            }).pipe(Effect.provide(createTestLayer()))
        );

        it("should return TemplateNotFoundError for missing prompt", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* Effect.either(service.getPrompt("MissingPrompt"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result) && result.left instanceof TemplateNotFoundError) {
                    expect(result.left.templateName).toBe("MissingPrompt");
                } else if (Either.isLeft(result)) {
                    // Fail test if it's Left but not TemplateNotFoundError
                    expect(result.left).toBeInstanceOf(TemplateNotFoundError);
                }
            }).pipe(Effect.provide(createTestLayer()))
        );

        it("should return TemplateNotFoundError if load failed", () =>
            Effect.gen(function* () {
                const readError = new ConfigReadError({ filePath: PROMPT_FILE_PATH });
                const layer = createTestLayer(() => Effect.fail(readError));

                const service = yield* PromptService;
                yield* Effect.ignore(service.load());
                const result = yield* Effect.either(service.getPrompt("TestPrompt1"));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result) && result.left instanceof TemplateNotFoundError) {
                    expect(result.left.templateName).toBe("TestPrompt1");
                } else if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(TemplateNotFoundError);
                }
            }).pipe(Effect.provide(createTestLayer(() =>
                Effect.fail(new ConfigReadError({ filePath: PROMPT_FILE_PATH }))
            )))
        );
    });

    describe("renderTemplate", () => {
        it("should render a loaded prompt template", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const rendered = yield* service.renderTemplate({
                    templateName: "TestPrompt1",
                    context: { name: "World" }
                });
                expect(rendered).toBe("Hello, World!");
            }).pipe(Effect.provide(createTestLayer()))
        );

        it("should return TemplateNotFoundError if template not loaded (due to load failure)", () =>
            Effect.gen(function* () {
                const readError = new ConfigReadError({ filePath: PROMPT_FILE_PATH });
                const layer = createTestLayer(() => Effect.fail(readError));

                const service = yield* PromptService;
                yield* Effect.ignore(service.load());

                const result = yield* Effect.either(service.renderTemplate({
                    templateName: "TestPrompt1",
                    context: { name: "World" }
                }));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result) && result.left instanceof TemplateNotFoundError) {
                    expect(result.left.templateName).toBe("TestPrompt1");
                } else if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(TemplateNotFoundError);
                }
            }).pipe(Effect.provide(createTestLayer(() =>
                Effect.fail(new ConfigReadError({ filePath: PROMPT_FILE_PATH }))
            )))
        );

        it("should return RenderingError for invalid data in template", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                yield* service.load();
                const result = yield* Effect.either(service.renderTemplate({
                    templateName: "TestPrompt1",
                    context: { wrong_key: "World" }
                }));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(RenderingError);
                }
            }).pipe(Effect.provide(createTestLayer()))
        );
    });

    describe("renderString", () => {
        it("should render a string template directly", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                const rendered = yield* service.renderString({
                    templateString: "Hi, {{user}}.",
                    context: { user: "Tester" }
                });
                expect(rendered).toBe("Hi, Tester.");
            }).pipe(Effect.provide(createTestLayer()))
        );

        it("should return RenderingError for invalid template string syntax", () =>
            Effect.gen(function* () {
                const service = yield* PromptService;
                const result = yield* Effect.either(service.renderString({
                    templateString: "Hi, {{user.", // Invalid Liquid syntax
                    context: { user: "Tester" }
                }));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(RenderingError);
                }
            }).pipe(Effect.provide(createTestLayer()))
        );
    });
});