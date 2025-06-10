import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer, Schema as S } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { PublicModelInfo } from "../schema.js";

import { ModelCapability } from "@/schema.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { ModelNotFoundError } from "../errors.js";
import { ModelService } from "../service.js";

const chatCapability = S.decodeSync(ModelCapability)("chat");
const functionCallingCapability = S.decodeSync(ModelCapability)("function-calling");
const BAD_PATH = "/non/existent/path.json";

describe("ModelService", () => {
    const chatCapability = "chat" as const satisfies S.Schema.Type<typeof ModelCapability>;
    const functionCallingCapability = "function-calling" as const satisfies S.Schema.Type<typeof ModelCapability>;

    // Create explicit dependency layers following centralized pattern
    const fileSystemLayer = NodeFileSystem.layer;
    const configurationLayer = Layer.provide(
        ConfigurationService.Default,
        fileSystemLayer
    );
    const modelServiceTestLayer = Layer.provide(
        ModelService.Default,
        configurationLayer
    );

    beforeEach(() => {
        process.env.MODELS_CONFIG_PATH = "/Users/paul/Projects/EffectiveAgent/src/services/ai/model/__tests__/config/models.json";
    });

    describe("validation", () => {
        it("should validate existing model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* service.validateModel("gpt-4o");
                expect(result).toBe(true);
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return ModelNotFoundError for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.validateModel("invalid-model"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("invalid-model");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );
    });

    describe("findModelsByCapability", () => {
        const chatCapability = "chat" as const satisfies S.Schema.Type<typeof ModelCapability>;
        const functionCallingCap = "function-calling" as const satisfies S.Schema.Type<typeof ModelCapability>;
        const invalidCapability = "invalid-capability" as unknown as S.Schema.Type<typeof ModelCapability>;

        it("should find models with chat capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability(chatCapability);
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model) => {
                    const hasCapability = model.capabilities.some(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === chatCapability
                    );
                    expect(hasCapability).toBe(true);
                });
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should find models with function-calling capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability(functionCallingCap);
                expect(models.length).toBe(1); // Only gpt-4o has function-calling
                models.forEach((model) => {
                    const hasCapability = model.capabilities.some(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === functionCallingCap
                    );
                    expect(hasCapability).toBe(true);
                    // Verify capability details
                    const capDetail = model.capabilities.find(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === functionCallingCap
                    );
                    expect(capDetail?.proficiency).toBe("expert");
                    expect(capDetail?.dimensions?.accuracy).toBeGreaterThan(0.9);
                });
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return ModelNotFoundError for non-existent capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.findModelsByCapability(invalidCapability));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );
    });

    describe("findModelsByCapabilities", () => {
        const validCapabilities = [chatCapability, functionCallingCapability];
        const invalidCapabilities = ["invalid-cap" as unknown as S.Schema.Type<typeof ModelCapability>];

        it("should find models with single capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities([chatCapability]);
                expect(models.length).toBe(2); // Both models have chat capability
                models.forEach((model) => {
                    const hasCapability = model.capabilities.some(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === chatCapability
                    );
                    expect(hasCapability).toBe(true);
                });
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should find models with multiple capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapabilities(validCapabilities);
                expect(models.length).toBe(1); // Only gpt-4o has both capabilities
                models.forEach((model) => {
                    validCapabilities.forEach((requiredCap: S.Schema.Type<typeof ModelCapability>) => {
                        const hasCapability = model.capabilities.some(
                            (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                                cap.capability === requiredCap
                        );
                        expect(hasCapability).toBe(true);
                    });
                    // Verify capability details
                    const chatDetail = model.capabilities.find(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === chatCapability
                    );
                    expect(chatDetail?.proficiency).toBe("expert");
                    expect(chatDetail?.dimensions?.accuracy).toBeGreaterThan(0.9);
                    
                    const funcDetail = model.capabilities.find(
                        (cap: { capability: S.Schema.Type<typeof ModelCapability> }) => 
                            cap.capability === functionCallingCapability
                    );
                    expect(funcDetail?.proficiency).toBe("expert");
                    expect(funcDetail?.dimensions?.reliability).toBeGreaterThan(0.9);
                });
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return ModelNotFoundError for non-existent capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.findModelsByCapabilities(invalidCapabilities));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );
    });

    describe("getProviderName", () => {
        it("should get provider name for existing model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const providerName = yield* service.getProviderName("gpt-4o");
                expect(providerName).toBe("openai");
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return openai for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const providerName = yield* service.getProviderName("invalid-model");
                expect(providerName).toBe("openai");
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );
    });

    describe("error handling", () => {
        beforeEach(() => {
            process.env.MODELS_CONFIG_PATH = "/Users/paul/Projects/EffectiveAgent/src/services/ai/model/__tests__/config/models.json";
        });

        it("should return ModelNotFoundError for exists on config error", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.exists("gpt-4o"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("gpt-4o");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return ModelNotFoundError for findModelsByCapability on config error", () =>
            Effect.gen(function* () {
                process.env.MODELS_CONFIG_PATH = BAD_PATH;
                const service = yield* ModelService;
                const result = yield* Effect.either(service.findModelsByCapability(chatCapability));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );

        it("should return ModelNotFoundError for findModelsByCapabilities on config error", () => {
            process.env.MODELS_CONFIG_PATH = BAD_PATH;
            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.findModelsByCapabilities([chatCapability]));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            );
        });

        it("should return ModelNotFoundError for getProviderName on config error", () => {
            process.env.MODELS_CONFIG_PATH = BAD_PATH;
            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getProviderName("gpt-4o"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("gpt-4o");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            );
        });

        it("should return ModelNotFoundError for getDefaultModelId on config error", () => {
            process.env.MODELS_CONFIG_PATH = BAD_PATH;
            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getDefaultModelId());
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("unknown");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            );
        });

        it("should return ModelNotFoundError for getModelsForProvider on config error", () => {
            process.env.MODELS_CONFIG_PATH = BAD_PATH;
            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.getModelsForProvider("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("unknown");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            );
        });

        it("should return ModelNotFoundError for validateModel on config error", () => {
            process.env.MODELS_CONFIG_PATH = BAD_PATH;
            return Effect.gen(function* () {
                const service = yield* ModelService;
                const result = yield* Effect.either(service.validateModel("gpt-4o"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                    expect(result.left.modelId).toBe("gpt-4o");
                }
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            );
        });
    });

    it("should load model configuration", () =>
        Effect.gen(function* () {
            const configService = yield* ConfigurationService;
            const masterConfig = yield* configService.getMasterConfig();
            const modelConfig = yield* configService.loadModelConfig(masterConfig.configPaths?.models || "./config/models.json");
            expect(modelConfig).toBeDefined();
        }).pipe(
            Effect.provide(modelServiceTestLayer)
        )
    );
    describe("debug", () => {
        it("should print the loaded config and config path", () =>
            Effect.gen(function* () {
                const configService = yield* ConfigurationService;
                const configPath = process.env.MODELS_CONFIG_PATH ?? "";
                console.log("MODELS_CONFIG_PATH:", configPath);
                const rawConfig = yield* configService.loadRawConfig(configPath);
                console.log("Loaded config:", JSON.stringify(rawConfig, null, 2));
                return rawConfig;
            }).pipe(
                Effect.provide(modelServiceTestLayer)
            )
        );
    });
}); 