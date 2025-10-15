import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import * as os from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { AgentRuntimeInitializationError } from "../errors.js";
import { InitializationService } from "../initialization.js";

describe("AgentRuntime Initialization Integration Tests", () => {
    let testDir: string;
    let masterConfigPath: string;
    let providersConfigPath: string;
    let modelsConfigPath: string;
    let policyConfigPath: string;

    const validMasterConfig = {
        runtimeSettings: {
            fileSystemImplementation: "node" as const
        },
        logging: {
            level: "info" as const,
            filePath: "./logs/test.log",
            enableConsole: true
        },
        agents: {
            agentsDirectory: "./agents",
            modelsConfigPath: "",
            providersConfigPath: "",
            policiesConfigPath: ""
        },
        configPaths: {
            models: "",
            providers: "",
            policy: ""
        }
    };

    const validProviderConfig = {
        version: "1.0.0",
        description: "Test providers",
        name: "openai",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat", "text-generation"]
            }
        ]
    };

    const validModelConfig = {
        name: "Test Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4o",
                name: "gpt-4-omni",
                displayName: "gpt-4-omni",
                version: "1.0.0",
                modelName: "gpt-4-omni",
                provider: {
                    name: "openai",
                    displayName: "OpenAI"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 128000,
                maxTokens: 4096
            }
        ]
    };

    const validPolicyConfig = {
        name: "Test-Policy-Config",
        version: "1.0.0",
        policies: [
            {
                id: "test-rule",
                name: "Test Rule",
                type: "allow",
                resource: "*",
                priority: 100,
                enabled: true,
                description: "A test policy rule"
            }
        ]
    };

    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Create a unique temp directory for this test
        testDir = mkdtempSync(join(os.tmpdir(), "agent-runtime-init-test-"));
        masterConfigPath = join(testDir, "master-config.json");
        providersConfigPath = join(testDir, "providers.json");
        modelsConfigPath = join(testDir, "models.json");
        policyConfigPath = join(testDir, "policy.json");

        // Patch config paths on a deep clone
        const masterConfig = JSON.parse(JSON.stringify(validMasterConfig));
        masterConfig.agents.modelsConfigPath = modelsConfigPath;
        masterConfig.agents.providersConfigPath = providersConfigPath;
        masterConfig.agents.policiesConfigPath = policyConfigPath;
        masterConfig.configPaths.models = modelsConfigPath;
        masterConfig.configPaths.providers = providersConfigPath;
        masterConfig.configPaths.policy = policyConfigPath;

        // Create test directory and files
        mkdirSync(testDir, { recursive: true });
        writeFileSync(masterConfigPath, JSON.stringify(masterConfig, null, 2));
        writeFileSync(providersConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validProviderConfig)), null, 2));
        writeFileSync(modelsConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validModelConfig)), null, 2));
        writeFileSync(policyConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validPolicyConfig)), null, 2));

        // Set up environment
        process.env.MASTER_CONFIG_PATH = masterConfigPath;
        process.env.PROVIDERS_CONFIG_PATH = providersConfigPath;
        process.env.MODELS_CONFIG_PATH = modelsConfigPath;
        process.env.POLICY_CONFIG_PATH = policyConfigPath;
        process.env.OPENAI_API_KEY = "test-key";
    });

    afterEach(() => {
        // Clean up test files
        try {
            unlinkSync(masterConfigPath);
            unlinkSync(providersConfigPath);
            unlinkSync(modelsConfigPath);
            unlinkSync(policyConfigPath);
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv };
    });

    const testLayer = Layer.mergeAll(
        InitializationService.Default,
        ProviderService.Default,
        ModelService.Default,
        PolicyService.Default,
        ConfigurationService.Default,
        NodeFileSystem.layer
    );

    describe("successful initialization", () => {
        it("should initialize AgentRuntime with valid configuration", () =>
            Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(validMasterConfig);

                expect(runtime).toBeDefined();
                // Runtime should be properly configured with all services
            }).pipe(
                Effect.provide(testLayer)
            ));

        it("should initialize with bun filesystem implementation", () => {
            const bunMasterConfig = {
                ...validMasterConfig,
                runtimeSettings: {
                    fileSystemImplementation: "bun" as const
                }
            };

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(bunMasterConfig);

                expect(runtime).toBeDefined();
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should perform health checks on all services during initialization", () =>
            Effect.gen(function* () {
                const initService = yield* InitializationService;

                // This should succeed because all config files are valid
                const runtime = yield* initService.initialize(validMasterConfig);
                expect(runtime).toBeDefined();
            }).pipe(
                Effect.provide(testLayer)
            ));
    });

    describe("configuration validation", () => {
        it("should fail with invalid master config structure", () => {
            const invalidMasterConfig = {
                name: "Test Agent Runtime",
                // Missing version and other required fields
            } as any;

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(invalidMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should fail with invalid filesystem implementation", () => {
            const invalidConfig = {
                ...validMasterConfig,
                runtimeSettings: {
                    ...validMasterConfig.runtimeSettings,
                    fileSystemImplementation: "invalid" as any
                }
            };

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(invalidConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should fail with invalid logging configuration", () => {
            const invalidConfig = {
                ...validMasterConfig,
                runtimeSettings: {
                    ...validMasterConfig.runtimeSettings,
                    logging: {
                        level: "invalid" as any,
                        filePath: "invalid-extension.txt"
                    }
                }
            };

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(invalidConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });
    });

    describe("service dependency scenarios", () => {
        it("should fail when provider configuration is invalid", () => {
            // Create invalid provider config
            const invalidProviderConfig = {
                name: "Invalid Providers Config",
                providers: [
                    {
                        name: "broken-provider"
                        // Missing required fields
                    }
                ]
            };

            writeFileSync(providersConfigPath, JSON.stringify(invalidProviderConfig, null, 2));

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(validMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                    expect((result.left as AgentRuntimeInitializationError).description).toContain("Service health check failed");
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should fail when model configuration is missing", () => {
            // Remove model config file
            unlinkSync(modelsConfigPath);

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(validMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should fail when policy configuration is malformed", () => {
            // Create malformed policy config
            writeFileSync(policyConfigPath, "{malformed json");

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(validMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });
    });

    describe("environment and path scenarios", () => {
        it("should handle missing environment variables gracefully", () => {
            // Remove API key
            process.env.OPENAI_API_KEY = undefined;

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(validMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });

        it("should handle missing config paths gracefully", () => {
            const configWithMissingPath = {
                ...validMasterConfig,
                agents: {
                    ...validMasterConfig.agents,
                    providersConfigPath: join(testDir, "nonexistent.json")
                }
            };

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(configWithMissingPath));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });
    });

    describe("logging configuration scenarios", () => {
        beforeEach(() => {
            // Always write a valid provider config before these tests
            writeFileSync(providersConfigPath, JSON.stringify(validProviderConfig, null, 2));
        });

        it.skip("should initialize with different log levels", async () => {
            const logLevels = ["error", "warn", "info", "debug", "trace"] as const;

            for (const level of logLevels) {
                writeFileSync(providersConfigPath, JSON.stringify(JSON.parse(JSON.stringify(validProviderConfig)), null, 2));
                console.log("[DEBUG] providers.json for log level", level, require("fs").readFileSync(providersConfigPath, "utf8"));
                const configWithLogLevel = JSON.parse(JSON.stringify(validMasterConfig));
                configWithLogLevel.logging = {
                    level,
                    filePath: `./logs/test-${level}.log`,
                    enableConsole: true
                };
                configWithLogLevel.agents.modelsConfigPath = modelsConfigPath;
                configWithLogLevel.agents.providersConfigPath = providersConfigPath;
                configWithLogLevel.agents.policiesConfigPath = policyConfigPath;
                configWithLogLevel.configPaths.models = modelsConfigPath;
                configWithLogLevel.configPaths.providers = providersConfigPath;
                configWithLogLevel.configPaths.policy = policyConfigPath;

                await Effect.runPromise(
                    Effect.gen(function* () {
                        const configService = yield* ConfigurationService;
                        const initService = yield* InitializationService;
                        const runtime = yield* initService.initialize(configWithLogLevel);
                        expect(runtime).toBeDefined();
                    }).pipe(
                        Effect.provide(testLayer)
                    ) as Effect.Effect<unknown, unknown, never>
                );
            }
        });

        it("should validate log file path extensions", () => {
            const invalidConfig = {
                ...validMasterConfig,
                logging: {
                    level: "info" as const,
                    filePath: "./logs/test.invalid",
                    enableConsole: true
                }
            };

            return Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(invalidConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            }).pipe(
                Effect.provide(testLayer)
            );
        });
    });

    describe("service integration scenarios", () => {
        it("should verify all services are properly integrated", () =>
            Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(validMasterConfig);

                // Test that we can run effects with the runtime
                const testEffect = Effect.gen(function* () {
                    const configService = yield* ConfigurationService;
                    const providerService = yield* ProviderService;
                    const modelService = yield* ModelService;
                    const policyService = yield* PolicyService;

                    // Verify all services are accessible
                    expect(configService).toBeDefined();
                    expect(providerService).toBeDefined();
                    expect(modelService).toBeDefined();
                    expect(policyService).toBeDefined();

                    return "integration-success";
                });

                const result = yield* Effect.provide(testEffect, runtime);
                expect(result).toBe("integration-success");
            }).pipe(
                Effect.provide(testLayer)
            ));

        it("should handle complex service interactions", () =>
            Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(validMasterConfig);

                // Test a complex flow that uses multiple services
                const complexEffect = Effect.gen(function* () {
                    const providerService = yield* ProviderService;
                    const modelService = yield* ModelService;

                    // Get a provider client
                    const client = yield* providerService.getProviderClient("openai");
                    expect(client).toBeDefined();

                    // Validate a model
                    const isValid = yield* modelService.validateModel("gpt-4o");
                    expect(isValid).toBe(true);

                    return "complex-flow-success";
                });

                const result = yield* Effect.provide(complexEffect, runtime);
                expect(result).toBe("complex-flow-success");
            }).pipe(
                Effect.provide(testLayer)
            ));
    });
}); 