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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
            )
        );
    });

    describe("findModelsByCapability", () => {
        const chatCapability = "chat" as const satisfies S.Schema.Type<typeof ModelCapability>;
        const invalidCapability = "invalid-capability" as unknown as S.Schema.Type<typeof ModelCapability>;

        it("should find models with chat capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models: readonly S.Schema.Type<typeof PublicModelInfo>[] =
                    yield* service.findModelsByCapability(chatCapability);
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model) => {
                    expect(model.vendorCapabilities).toContain("chat");
                });
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
            )
        );
    });

    describe("findModelsByCapabilities", () => {
        const validCapabilities = ["chat", "text-generation"] as S.Schema.Type<typeof ModelCapability>[];
        const invalidCapabilities = [S.decodeSync(ModelCapability)("text-generation")];
        it("should return all models with chat capability", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const models = yield* service.findModelsByCapability(chatCapability);
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model: PublicModelInfo) =>
                    expect(model.vendorCapabilities).toContain("chat")
                );
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
            )
        );

        it("should find all models with multiple capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const capabilities = [chatCapability, functionCallingCapability];
                const models = yield* service.findModelsByCapabilities(capabilities);
                expect(models.length).toBeGreaterThan(0);
                models.forEach((model: PublicModelInfo) => {
                    expect(model.vendorCapabilities).toContain("chat");
                    expect(model.vendorCapabilities).toContain("function-calling");
                });
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
            )
        );

        it("should return ModelNotFoundError for non-existent capabilities", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const invalidCapability = S.decodeSync(ModelCapability)("text-generation");
                const result = yield* Effect.either(service.findModelsByCapabilities([invalidCapability]));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ModelNotFoundError);
                }
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
            )
        );

        it("should return openai for non-existent model", () =>
            Effect.gen(function* () {
                const service = yield* ModelService;
                const providerName = yield* service.getProviderName("invalid-model");
                expect(providerName).toBe("openai");
            }).pipe(
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
                Effect.provide(Layer.mergeAll(
                    NodeFileSystem.layer,
                    ConfigurationService.Default,
                    ModelService.Default
                ))
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
            Effect.provide(Layer.mergeAll(
                NodeFileSystem.layer,
                ConfigurationService.Default,
                ModelService.Default
            ))
        )
    );
});

describe("ModelService (debug)", () => {
    it("should print the loaded config and config path", () =>
        Effect.gen(function* () {
            const configService = yield* ConfigurationService;
            const configPath = process.env.MODELS_CONFIG_PATH ?? "";
            console.log("MODELS_CONFIG_PATH:", configPath);
            const rawConfig = yield* configService.loadRawConfig(configPath);
            console.log("Loaded config:", JSON.stringify(rawConfig, null, 2));
            return rawConfig;
        }).pipe(
            Effect.provide(Layer.mergeAll(
                NodeFileSystem.layer,
                ConfigurationService.Default,
                ModelService.Default
            ))
        )
    );
}); 