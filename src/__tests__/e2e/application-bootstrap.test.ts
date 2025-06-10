import { existsSync, mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AgentRuntimeInitializationError } from "@/ea-agent-runtime/errors.js";
import InitializationService from "@/ea-agent-runtime/initialization.js";
import { MasterConfig } from "@/ea-agent-runtime/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { PolicyService } from "@/services/ai/policy/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";

describe("End-to-End Application Bootstrap Tests", () => {
    // Comprehensive test layer that includes InitializationService and all service dependencies
    const CompleteTestLayer = Layer.provideMerge(
        InitializationService.Default,
        Layer.provideMerge(
            ModelService.Default,
            Layer.provideMerge(
                Layer.merge(ProviderService.Default, PolicyService.Default),
                Layer.provideMerge(ConfigurationService.Default, NodeFileSystem.layer)
            )
        )
    );

    const testDir = join(process.cwd(), "test-e2e-configs");
    const masterConfigPath = join(testDir, "master-config.json");
    const providersConfigPath = join(testDir, "providers.json");
    const modelsConfigPath = join(testDir, "models.json");
    const policyConfigPath = join(testDir, "policy.json");
    const logsDir = join(testDir, "logs");

    // Production-like configuration based on real config files
    const productionMasterConfig: MasterConfig = {
        name: "Effective Agent",
        version: "1.0.0",
        runtimeSettings: {
            fileSystemImplementation: "node"
        },
        logging: {
            level: "info",
            filePath: "./logs/app.log",
            enableConsole: true
        },
        configPaths: {
            providers: providersConfigPath,
            models: modelsConfigPath,
            policy: policyConfigPath
        }
    };

    const productionProviderConfig = {
        name: "Production Providers Config",
        version: "1.0.0",
        description: "AI Provider configurations",
        providers: [
            {
                name: "openai",
                displayName: "OpenAI",
                type: "llm",
                apiKeyEnvVar: "OPENAI_API_KEY",
                baseUrl: "https://api.openai.com/v1",
                capabilities: ["chat", "text-generation", "embeddings"],
                rateLimit: {
                    maxRequests: 100,
                    perSeconds: 60
                }
            },
            {
                name: "anthropic",
                displayName: "Anthropic",
                type: "llm",
                apiKeyEnvVar: "ANTHROPIC_API_KEY",
                baseUrl: "https://api.anthropic.com",
                capabilities: ["chat", "text-generation"]
            }
        ]
    };

    const productionModelConfig = {
        name: "Production Models Config",
        version: "1.0.0",
        models: [
            {
                id: "gpt-4o",
                displayName: "GPT-4 Omni",
                provider: {
                    name: "openai",
                    displayName: "OpenAI"
                },
                vendorCapabilities: ["chat", "text-generation", "embeddings"],
                contextWindow: 128000,
                maxTokens: 4096,
                supportedFeatures: ["function-calling", "json-mode"]
            },
            {
                id: "claude-3-5-sonnet-20241022",
                displayName: "Claude 3.5 Sonnet",
                provider: {
                    name: "anthropic",
                    displayName: "Anthropic"
                },
                vendorCapabilities: ["chat", "text-generation"],
                contextWindow: 200000,
                maxTokens: 8192,
                supportedFeatures: ["function-calling", "vision"]
            }
        ]
    };

    const productionPolicyConfig = {
        name: "Production Policy Config",
        version: "1.0.0",
        rules: [
            {
                id: "rate-limit-rule",
                name: "Rate Limiting",
                description: "Enforce rate limits on API calls",
                enabled: true,
                action: "throttle",
                conditions: {
                    requestsPerMinute: 60
                },
                priority: 100
            },
            {
                id: "content-filter-rule",
                name: "Content Filtering",
                description: "Filter inappropriate content",
                enabled: true,
                action: "block",
                conditions: {
                    containsInappropriateContent: true
                },
                priority: 200
            }
        ]
    };

    // Store original env vars
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Create test directory structure
        mkdirSync(testDir, { recursive: true });
        mkdirSync(logsDir, { recursive: true });

        // Write production-like config files
        writeFileSync(masterConfigPath, JSON.stringify(productionMasterConfig, null, 2));
        writeFileSync(providersConfigPath, JSON.stringify(productionProviderConfig, null, 2));
        writeFileSync(modelsConfigPath, JSON.stringify(productionModelConfig, null, 2));
        writeFileSync(policyConfigPath, JSON.stringify(productionPolicyConfig, null, 2));

        // Set up production-like environment
        process.env.EFFECTIVE_AGENT_MASTER_CONFIG = masterConfigPath;
        process.env.OPENAI_API_KEY = "test-openai-key-12345";
        process.env.ANTHROPIC_API_KEY = "test-anthropic-key-67890";
    });

    afterEach(() => {
        // Clean up test files
        try {
            if (existsSync(masterConfigPath)) unlinkSync(masterConfigPath);
            if (existsSync(providersConfigPath)) unlinkSync(providersConfigPath);
            if (existsSync(modelsConfigPath)) unlinkSync(modelsConfigPath);
            if (existsSync(policyConfigPath)) unlinkSync(policyConfigPath);
            if (existsSync(logsDir)) rmdirSync(logsDir, { recursive: true });
            if (existsSync(testDir)) rmdirSync(testDir, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors
        }

        // Reset environment
        process.env = { ...originalEnv };
    });

    describe("Master Config Bootstrap", () => {
        it("should load master config from EFFECTIVE_AGENT_MASTER_CONFIG environment variable", () =>
            Effect.gen(function* () {
                // Verify the environment variable is set correctly
                expect(process.env.EFFECTIVE_AGENT_MASTER_CONFIG).toBe(masterConfigPath);

                // Test that we can load and validate the master config
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(productionMasterConfig);

                expect(runtime).toBeDefined();
            }).pipe(
                Effect.provide(CompleteTestLayer)
            ));

        it("should fail gracefully when EFFECTIVE_AGENT_MASTER_CONFIG points to non-existent file", async () => {
            process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(testDir, "nonexistent.json");

            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(productionMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });

        it("should validate master config schema during bootstrap", async () => {
            // Create invalid master config (missing required fields)
            const invalidMasterConfig = {
                version: "1.0.0"
                // Missing name, runtimeSettings, configPaths
            };
            writeFileSync(masterConfigPath, JSON.stringify(invalidMasterConfig, null, 2));

            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(invalidMasterConfig as any));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });
    });

    describe("Complete Application Lifecycle", () => {
        it("should successfully initialize complete application stack", async () => {
            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(productionMasterConfig);

                // Verify runtime is created
                expect(runtime).toBeDefined();

                // Test complete service stack availability
                const applicationTest = Effect.gen(function* () {
                    const configService = yield* ConfigurationService;
                    const providerService = yield* ProviderService;
                    const modelService = yield* ModelService;
                    const policyService = yield* PolicyService;

                    // Verify all services are available
                    expect(configService).toBeDefined();
                    expect(providerService).toBeDefined();
                    expect(modelService).toBeDefined();
                    expect(policyService).toBeDefined();

                    // Test cross-service integration
                    const openaiClient = yield* providerService.getProviderClient("openai");
                    expect(openaiClient).toBeDefined();
                    expect(openaiClient.chat).toBeDefined();

                    const anthropicClient = yield* providerService.getProviderClient("anthropic");
                    expect(anthropicClient).toBeDefined();
                    expect(anthropicClient.chat).toBeDefined();

                    // Test model validation
                    const gpt4Valid = yield* modelService.validateModel("gpt-4o");
                    expect(gpt4Valid).toBe(true);

                    const claudeValid = yield* modelService.validateModel("claude-3-5-sonnet-20241022");
                    expect(claudeValid).toBe(true);

                    return {
                        configLoaded: true,
                        providersReady: true,
                        modelsValidated: true,
                        policiesLoaded: true
                    };
                });

                const result = yield* Effect.provide(applicationTest, runtime);
                expect(result.configLoaded).toBe(true);
                expect(result.providersReady).toBe(true);
                expect(result.modelsValidated).toBe(true);
                expect(result.policiesLoaded).toBe(true);
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });

        it("should handle realistic agent execution scenario", async () => {
            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(productionMasterConfig);

                // Simulate a realistic agent execution flow
                const agentExecutionFlow = Effect.gen(function* () {
                    const providerService = yield* ProviderService;
                    const modelService = yield* ModelService;
                    const policyService = yield* PolicyService;

                    // Step 1: Get provider client for a model
                    const provider = yield* providerService.getProviderClient("openai");

                    // Step 2: Validate model is available
                    const modelValid = yield* modelService.validateModel("gpt-4o");
                    expect(modelValid).toBe(true);

                    // Step 3: Check policies allow the operation
                    const policyCheck = yield* policyService.checkPolicy({
                        auth: { userId: "test-user" },
                        requestedModel: "gpt-4o",
                        operationType: "chat"
                    });
                    expect(policyCheck).toBeDefined();

                    // Step 4: Simulate chat capabilities
                    const capabilities = provider.getCapabilities();
                    expect(capabilities).toContain("chat");

                    return {
                        providerReady: true,
                        modelValidated: true,
                        policyChecked: true,
                        capabilitiesVerified: true,
                        executionTime: Date.now()
                    };
                });

                const result = yield* Effect.provide(agentExecutionFlow, runtime);
                expect(result.providerReady).toBe(true);
                expect(result.modelValidated).toBe(true);
                expect(result.policyChecked).toBe(true);
                expect(result.capabilitiesVerified).toBe(true);
                expect(result.executionTime).toBeGreaterThan(0);
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });
    });

    describe("Configuration Error Scenarios", () => {
        it("should propagate errors through complete stack when provider config is invalid", () => {
            // Create invalid provider config
            const invalidProviderConfig = {
                name: "Invalid Config",
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
                const result = yield* Effect.either(initService.initialize(productionMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                    expect((result.left as AgentRuntimeInitializationError).description).toContain("Service health check failed");
                }
            }).pipe(
                Effect.provide(CompleteTestLayer)
            );
        });

        it("should handle missing environment variables across all services", async () => {
            // Remove all API keys
            process.env.OPENAI_API_KEY = undefined;
            process.env.ANTHROPIC_API_KEY = undefined;

            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(productionMasterConfig));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });

        it("should validate config file paths exist before proceeding", async () => {
            // Point to non-existent config files
            const configWithMissingFiles = {
                ...productionMasterConfig,
                configPaths: {
                    providers: join(testDir, "missing-providers.json"),
                    models: join(testDir, "missing-models.json"),
                    policy: join(testDir, "missing-policy.json")
                }
            };

            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const result = yield* Effect.either(initService.initialize(configWithMissingFiles));

                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(AgentRuntimeInitializationError);
                }
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });
    });

    describe("Real Config File Integration", () => {
        it("should work with actual config files from /config directory", async () => {
            const realConfigDir = resolve(process.cwd(), "config");
            const realMasterConfig = join(realConfigDir, "master-config.json");

            // Only run this test if real config files exist
            if (existsSync(realMasterConfig)) {
                // Update environment to point to real configs
                process.env.EFFECTIVE_AGENT_MASTER_CONFIG = realMasterConfig;

                const testLayer = CompleteTestLayer;

                const effect = Effect.gen(function* () {
                    const initService = yield* InitializationService;

                    // Load the real master config
                    const fs = yield* FileSystem.FileSystem;
                    const realConfigContent = yield* fs.readFileString(realMasterConfig, "utf8");
                    const realConfig = JSON.parse(realConfigContent);

                    // Initialize with real config
                    const runtime = yield* initService.initialize(realConfig);
                    expect(runtime).toBeDefined();

                    // Test with real configuration
                    const realConfigTest = Effect.gen(function* () {
                        const configService = yield* ConfigurationService;
                        const providerService = yield* ProviderService;

                        // Test loading real provider configs
                        const providers = yield* Effect.either(providerService.getProviderClient("openai"));

                        // Should either succeed with real API key or fail gracefully
                        if (Either.isLeft(providers)) {
                            // Expected if no real API key is set
                            expect(providers.left).toBeDefined();
                        } else {
                            // If API key exists, provider should be ready
                            expect(providers.right).toBeDefined();
                        }

                        return "real-config-test-complete";
                    });

                    const result = yield* Effect.provide(realConfigTest, runtime);
                    expect(result).toBe("real-config-test-complete");
                });

                await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
            } else {
                // Skip test if real config doesn't exist
                console.warn("Skipping real config test - /config directory not found");
            }
        });
    });

    describe("Performance and Reliability", () => {
        it("should initialize within reasonable time limits", async () => {
            const startTime = Date.now();

            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(productionMasterConfig);

                const endTime = Date.now();
                const initializationTime = endTime - startTime;

                expect(runtime).toBeDefined();
                expect(initializationTime).toBeLessThan(5000); // Should init within 5 seconds

                console.log(`Application initialized in ${initializationTime}ms`);
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });

        it("should handle concurrent service access", async () => {
            const testLayer = CompleteTestLayer;

            const effect = Effect.gen(function* () {
                const initService = yield* InitializationService;
                const runtime = yield* initService.initialize(productionMasterConfig);

                // Test concurrent access to services
                const concurrentTests = [1, 2, 3, 4, 5].map(i =>
                    Effect.gen(function* () {
                        const providerService = yield* ProviderService;
                        const modelService = yield* ModelService;

                        const client = yield* providerService.getProviderClient("openai");
                        const isValid = yield* modelService.validateModel("gpt-4o");

                        return { testId: i, clientReady: !!client, modelValid: isValid };
                    }).pipe(Effect.provide(runtime))
                );

                const results = yield* Effect.all(concurrentTests, { concurrency: 5 });

                // All concurrent tests should succeed
                expect(results).toHaveLength(5);
                results.forEach(result => {
                    expect(result.clientReady).toBe(true);
                    expect(result.modelValid).toBe(true);
                });
            });

            await Effect.runPromise(effect.pipe(Effect.provide(testLayer)));
        });
    });
}); 