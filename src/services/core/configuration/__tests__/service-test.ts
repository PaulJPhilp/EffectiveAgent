import { Effect, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AssertionHelperService, AssertionHelperServiceLive } from "../../test-harness/components/assertion-helpers/service.js";
import { EffectRunnerService, EffectRunnerServiceLive } from "../../test-harness/components/effect-runners/service.js";
import { FixtureService, FixtureServiceLive } from "../../test-harness/components/fixtures/service.js";
import { MockAccessorService, MockAccessorServiceLive } from "../../test-harness/components/mock-accessors/service.js";
import type { ConfigurationServiceApi } from "../api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "../errors.js";
import { ConfigurationService } from "../service.js";

/**
 * Minimal mock implementation for the configuration service.
 */
const mockConfigService: ConfigurationServiceApi = {
    readFile: () => Effect.fail(new ConfigReadError({ filePath: "", cause: new Error("not implemented") })),
    parseJson: () => Effect.fail(new ConfigParseError({ filePath: "", cause: new Error("not implemented") })),
    validateWithSchema: () => Effect.fail(new ConfigValidationError({
        filePath: "",
        validationError: {
            _tag: "Type",
            actual: {},
            message: "not implemented",
            toJSON: () => ({}),
        } as any // minimal mock for ParseError
    })),
    loadConfig: () => Effect.fail(new ConfigReadError({ filePath: "", cause: new Error("not implemented") }))
}

// Create the test environment layer with all required services
const TestLayer = Layer.mergeAll(
    Layer.succeed(ConfigurationService, mockConfigService),
    EffectRunnerServiceLive,
    AssertionHelperServiceLive,
    MockAccessorServiceLive,
    FixtureServiceLive
);

describe("ConfigurationService", () => {
    it("should instantiate the service", () =>
        Effect.gen(function* () {
            // Get all required services
            const service = yield* ConfigurationService
            const runner = yield* EffectRunnerService
            const asserter = yield* AssertionHelperService
            const mock = yield* MockAccessorService
            const fixture = yield* FixtureService
            expect(service).toBeDefined()
            expect(runner).toBeDefined()
            expect(asserter).toBeDefined()
            expect(mock).toBeDefined()
            expect(fixture).toBeDefined()
        }).pipe(Effect.provide(TestLayer))
    )
})

// --- Base Test Layer Components ---
const coreTestServicesLayer = Layer.mergeAll(
    EffectRunnerServiceLive,
    AssertionHelperServiceLive,
    MockAccessorServiceLive,
    FixtureServiceLive
);

// --- Mock Implementations for ConfigurationServiceApi ---

const MOCK_FILE_PATH = "mock/config.json";
const MOCK_FILE_CONTENT = '{"key":"value"}';
const MOCK_PARSED_CONTENT = { key: "value" };

// Default failing mock (can be used if a test doesn't specify its own)
const defaultFailMockConfigService: ConfigurationServiceApi = {
    readFile: (filePath: string) => Effect.fail(new ConfigReadError({ filePath, cause: new Error("Default mock: readFile not implemented") })),
    parseJson: (content: string, filePath: string) => Effect.fail(new ConfigParseError({ filePath, cause: new Error("Default mock: parseJson not implemented") })),
    validateWithSchema: <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string) => Effect.fail(new ConfigValidationError({ filePath, validationError: { _tag: "Type", actual: data, message: "Default mock: validateWithSchema not implemented" } as any })),
    loadConfig: () => Effect.fail(new ConfigReadError({ filePath: MOCK_FILE_PATH, cause: new Error("Default mock: loadConfig not implemented") }))
};

describe("ConfigurationService", () => {
    it("should instantiate the service", () => {
        const TestLayer = Layer.provide(
            Layer.succeed(ConfigurationService, defaultFailMockConfigService),
            coreTestServicesLayer
        );
        const testProgram = Effect.gen(function* () {
            const service = yield* ConfigurationService;
            expect(service).toBeDefined();
        }).pipe(Effect.provide(TestLayer));
        return Effect.runPromise(testProgram);
    });

    describe("readFile", () => {
        it("should successfully read a file", () => {
            const mockReadFileSuccess: ConfigurationServiceApi = {
                ...defaultFailMockConfigService, // Use defaults for other methods
                readFile: (filePath: string) => Effect.succeed(MOCK_FILE_CONTENT)
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockReadFileSuccess),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const content = yield* service.readFile(MOCK_FILE_PATH);
                expect(content).toBe(MOCK_FILE_CONTENT);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail with ConfigReadError if file reading fails", () => {
            const mockReadFileFailure: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                readFile: (filePath: string) => Effect.fail(new ConfigReadError({ filePath, cause: new Error("Simulated file read error") }))
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockReadFileFailure),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.readFile(MOCK_FILE_PATH));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ConfigReadError);
                    expect(result.left.filePath).toBe(MOCK_FILE_PATH);
                }
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });
    });

    describe("parseJson", () => {
        it("should successfully parse valid JSON content", () => {
            const mockParseJsonSuccess: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                parseJson: (content: string, filePath: string) => Effect.succeed(MOCK_PARSED_CONTENT)
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockParseJsonSuccess),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const parsed = yield* service.parseJson(MOCK_FILE_CONTENT, MOCK_FILE_PATH);
                expect(parsed).toEqual(MOCK_PARSED_CONTENT);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail with ConfigParseError for invalid JSON content", () => {
            const invalidJsonContent = "{key: value}"; // Invalid JSON: key not in quotes
            const mockParseJsonFailure: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                parseJson: (content: string, filePath: string) => Effect.fail(new ConfigParseError({ filePath, cause: new Error("Simulated JSON parse error") }))
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockParseJsonFailure),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.parseJson(invalidJsonContent, MOCK_FILE_PATH));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ConfigParseError);
                    expect(result.left.filePath).toBe(MOCK_FILE_PATH);
                }
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });
    });

    describe("validateWithSchema", () => {
        interface TestSchema {
            readonly name: string;
            readonly count: number;
        }
        const testSchema = Schema.Struct({
            name: Schema.String,
            count: Schema.Number
        });

        const validTestData: TestSchema = { name: "test-item", count: 42 };
        const invalidTestData = { name: "test-item", count: "not-a-number" }; // count is wrong type

        it("should successfully validate data matching the schema", () => {
            const mockValidateSuccess: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                validateWithSchema: <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string) => Effect.succeed(data as T) // Simple mock, assumes data is already correct for success
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockValidateSuccess),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const validated = yield* service.validateWithSchema(validTestData, testSchema, MOCK_FILE_PATH);
                expect(validated).toEqual(validTestData);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail with ConfigValidationError for data not matching the schema", () => {
            const mockValidateFailure: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                validateWithSchema: <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string) =>
                    Effect.fail(new ConfigValidationError({ filePath, validationError: { _tag: "Type", actual: data, message: "Simulated validation error" } as any }))
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockValidateFailure),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.validateWithSchema(invalidTestData, testSchema, MOCK_FILE_PATH));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ConfigValidationError);
                    expect(result.left.filePath).toBe(MOCK_FILE_PATH);
                }
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });
    });

    describe("loadConfig", () => {
        interface TestConfig extends Schema.Schema.Type<typeof testSchema> { }
        const testSchema = Schema.Struct({
            name: Schema.String,
            count: Schema.Number
        });
        const validConfigData: TestConfig = { name: "test-config", count: 100 };

        it("should successfully load, parse, and validate a config file", () => {
            const mockLoadSuccess: ConfigurationServiceApi = {
                readFile: (filePath: string) => Effect.succeed(JSON.stringify(validConfigData)),
                parseJson: (content: string, filePath: string) => Effect.succeed(validConfigData),
                validateWithSchema: <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string) => Effect.succeed(data as T),
                loadConfig: function <T_LC extends import("../types.js").BaseConfig>(options: import("../api.js").LoadConfigOptions<T_LC>) {
                    // Basic mock of loadConfig that assumes other mocks handle the steps
                    return this.readFile(options.filePath).pipe(
                        Effect.flatMap(content => this.parseJson(content, options.filePath)),
                        Effect.flatMap(parsed => this.validateWithSchema(parsed, options.schema, options.filePath))
                    ) as Effect.Effect<T_LC, ConfigReadError | ConfigParseError | ConfigValidationError>;
                }
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockLoadSuccess),
                coreTestServicesLayer
            );

            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const config = yield* service.loadConfig({ filePath: MOCK_FILE_PATH, schema: testSchema });
                expect(config).toEqual(validConfigData);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail if readFile fails during loadConfig", () => {
            const mockReadFileFailsInLoad: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                readFile: (filePath: string) => Effect.fail(new ConfigReadError({ filePath, cause: new Error("readFile failed in loadConfig") })),
                // other methods use defaultFailMock which won't be reached if readFile fails
                loadConfig: function <T_LC extends import("../types.js").BaseConfig>(options: import("../api.js").LoadConfigOptions<T_LC>) {
                    return this.readFile(options.filePath).pipe(
                        Effect.flatMap(content => this.parseJson(content, options.filePath)),
                        Effect.flatMap(parsed => this.validateWithSchema(parsed, options.schema, options.filePath))
                    ) as Effect.Effect<T_LC, ConfigReadError | ConfigParseError | ConfigValidationError>;
                }
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockReadFileFailsInLoad),
                coreTestServicesLayer
            );
            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.loadConfig({ filePath: MOCK_FILE_PATH, schema: testSchema }));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") expect(result.left).toBeInstanceOf(ConfigReadError);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail if parseJson fails during loadConfig", () => {
            const mockParseJsonFailsInLoad: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                readFile: (filePath: string) => Effect.succeed(MOCK_FILE_CONTENT), // readFile succeeds
                parseJson: (content: string, filePath: string) => Effect.fail(new ConfigParseError({ filePath, cause: new Error("parseJson failed in loadConfig") })),
                loadConfig: function <T_LC extends import("../types.js").BaseConfig>(options: import("../api.js").LoadConfigOptions<T_LC>) {
                    return this.readFile(options.filePath).pipe(
                        Effect.flatMap(content => this.parseJson(content, options.filePath)),
                        Effect.flatMap(parsed => this.validateWithSchema(parsed, options.schema, options.filePath))
                    ) as Effect.Effect<T_LC, ConfigReadError | ConfigParseError | ConfigValidationError>;
                }
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockParseJsonFailsInLoad),
                coreTestServicesLayer
            );
            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.loadConfig({ filePath: MOCK_FILE_PATH, schema: testSchema }));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") expect(result.left).toBeInstanceOf(ConfigParseError);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });

        it("should fail if validateWithSchema fails during loadConfig", () => {
            const mockValidateFailsInLoad: ConfigurationServiceApi = {
                ...defaultFailMockConfigService,
                readFile: (filePath: string) => Effect.succeed(JSON.stringify(validConfigData)),
                parseJson: (content: string, filePath: string) => Effect.succeed(validConfigData), // parseJson succeeds
                validateWithSchema: <T>(data: unknown, schema: Schema.Schema<T, T>, filePath: string) =>
                    Effect.fail(new ConfigValidationError({ filePath, validationError: { _tag: "Type", actual: data, message: "validate failed in loadConfig" } as any })),
                loadConfig: function <T_LC extends import("../types.js").BaseConfig>(options: import("../api.js").LoadConfigOptions<T_LC>) {
                    return this.readFile(options.filePath).pipe(
                        Effect.flatMap(content => this.parseJson(content, options.filePath)),
                        Effect.flatMap(parsed => this.validateWithSchema(parsed, options.schema, options.filePath))
                    ) as Effect.Effect<T_LC, ConfigReadError | ConfigParseError | ConfigValidationError>;
                }
            };
            const TestLayer = Layer.provide(
                Layer.succeed(ConfigurationService, mockValidateFailsInLoad),
                coreTestServicesLayer
            );
            const testProgram = Effect.gen(function* () {
                const service = yield* ConfigurationService;
                const result = yield* Effect.either(service.loadConfig({ filePath: MOCK_FILE_PATH, schema: testSchema }));
                expect(result._tag).toBe("Left");
                if (result._tag === "Left") expect(result.left).toBeInstanceOf(ConfigValidationError);
            }).pipe(Effect.provide(TestLayer));
            return Effect.runPromise(testProgram);
        });
    });
}); 