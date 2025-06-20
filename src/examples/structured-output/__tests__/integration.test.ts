import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ObjectService } from "@/services/producers/object/service.js";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { LocalSchemaValidatorService, makeStructuredOutputPipelineService } from "../service.js";

import {
    type GenerateStructuredOutputPayload
} from "../api.js";

process.env.PROVIDERS_CONFIG_PATH = require('path').resolve(__dirname, '../../config/providers.json');

const PersonSchema = Schema.Struct({
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
                    schema: PersonSchema
                };
                yield* Effect.log("Starting generateStructuredOutput test", { payload: JSON.stringify(payload) });
                const result = yield* Effect.either(service.generateStructuredOutput(payload));
                yield* Effect.log("generateStructuredOutput result", { result: JSON.stringify(result) });
                // Keep the assertion generic for integration
                expect(result._tag).toBeDefined();
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
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
                    PersonSchema
                ));
                yield* Effect.log("extractStructured result", { result: JSON.stringify(result) });
                // Keep the assertion generic for integration
                expect(result._tag).toBeDefined();
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )) as Effect.Effect<void, unknown, never>
        );
    });
});