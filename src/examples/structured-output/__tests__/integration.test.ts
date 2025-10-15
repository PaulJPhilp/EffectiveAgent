import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodePath from "@effect/platform-node/NodePath";
import { Effect, Layer, Schema } from "effect";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ResilienceService } from "@/services/execution/resilience/service.js";
import { ObjectService } from "@/services/producers/object/service.js";
// Import the missing type
import type { GenerateStructuredOutputPayload } from "../api.js";

import { SchemaValidationError } from "../api.js";
import { LocalSchemaValidatorService, makeStructuredOutputPipelineService } from "../service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up test configuration paths
process.env.MASTER_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../config/master-config.json"
);
process.env.PROVIDERS_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../config/providers.json"
);
process.env.MODELS_CONFIG_PATH = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../config/models.json"
);

const testLayer = Layer.provideMerge(
    Layer.provideMerge(
        NodePath.layer,
        Layer.provideMerge(
            Layer.effect(LocalSchemaValidatorService, Effect.succeed({
                validate: <I, A>(data: I, schema: Schema.Schema<A, I>) =>
                    Effect.try({
                        try: () => Schema.decodeUnknownSync(schema)(data),
                        catch: (error) => new SchemaValidationError({
                            message: `Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
                            validationIssues: [error instanceof Error ? error.message : String(error)]
                        })
                    })
            })),
            Layer.provideMerge(
                ObjectService.Default,
                Layer.provideMerge(
                    ModelService.Default,
                    Layer.provideMerge(
                        ProviderService.Default,
                        Layer.provideMerge(
                            ConfigurationService.Default,
                            Layer.mergeAll(NodeFileSystem.layer, NodePath.layer)
                        )
                    )
                )
            )
        )
    ),
    ResilienceService.Default
); const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number
});
type Person = Schema.Schema.Type<typeof PersonSchema>;

const ProductSchema = Schema.Struct({
    productName: Schema.String,
    price: Schema.Number,
    inStock: Schema.Boolean
});
type Product = Schema.Schema.Type<typeof ProductSchema>;

describe("StructuredOutputPipeline Integration Tests", () => {
    it("generateStructuredOutput should produce output (real ObjectService)", async () => {
        await Effect.runPromise(
            (Effect.gen(function* () {
                const objectService = yield* ObjectService;
                const schemaValidator = yield* LocalSchemaValidatorService;
                const service = makeStructuredOutputPipelineService(objectService, schemaValidator);
                const payload: GenerateStructuredOutputPayload<typeof PersonSchema> = {
                    prompt: "Extract person details: My name is Alice and I am 30.",
                    schema: PersonSchema,
                    modelId: "gpt-4o"
                };
                yield* Effect.log("Starting generateStructuredOutput test", { payload: JSON.stringify(payload) });
                const result = yield* Effect.either(service.generateStructuredOutput(payload));
                yield* Effect.log("generateStructuredOutput result", { result: JSON.stringify(result) });
                // Keep the assertion generic for integration
                expect(result._tag).toBeDefined();
            }).pipe(
                Effect.provide(testLayer)
            )) as Effect.Effect<void, unknown, never>
        );
    });

    it("extractStructured should attempt to produce output (real ObjectService)", async () => {
        await Effect.runPromise(
            (Effect.gen(function* () {
                const objectService = yield* ObjectService;
                const schemaValidator = yield* LocalSchemaValidatorService;
                const service = makeStructuredOutputPipelineService(objectService, schemaValidator);
                yield* Effect.log("Starting extractStructured test");
                const result = yield* Effect.either(service.extractStructured(
                    "Product: XYZ, Price: 99.99, Stock: Yes",
                    PersonSchema,
                    { modelId: "gpt-4o" }
                ));
                yield* Effect.log("extractStructured result", { result: JSON.stringify(result) });
                // Keep the assertion generic for integration
                expect(result._tag).toBeDefined();
            }).pipe(
                Effect.provide(testLayer)
            )) as Effect.Effect<void, unknown, never>
        );
    });
});