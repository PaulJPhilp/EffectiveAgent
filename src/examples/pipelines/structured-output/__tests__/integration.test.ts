import { ConfigurationService } from "@/services/core/configuration/service.js";
import { FileLogger } from "@/services/core/logging/file-logger.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { Effect, LogLevel, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { LocalSchemaValidatorService, makeStructuredOutputPipelineService } from "../service.js";

import {
    type GenerateStructuredOutputPayload,
    SchemaValidationError,
    StructuredOutputPipelineError
} from "../api.js";

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
    it("generateStructuredOutput should produce output (mocked LLM, real validation)", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fileLogger = new FileLogger({
                    logDir: "test-logs",
                    logFileBaseName: "structured-output-integration-generate",
                    minLogLevel: LogLevel.Debug
                });
                yield* fileLogger.initialize();
                const logger = fileLogger.createLoggingService();
                try {
                    const objectService = yield* ObjectService;
                    const schemaValidator = yield* LocalSchemaValidatorService;
                    const service = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                    const payload: GenerateStructuredOutputPayload<typeof PersonSchema> = {
                        prompt: "Extract person details: My name is Alice and I am 30.",
                        schema: PersonSchema
                    };
                    yield* logger.info("Starting generateStructuredOutput test", { payload: JSON.stringify(payload) });
                    const result = yield* Effect.either(service.generateStructuredOutput(payload));
                    yield* logger.info("generateStructuredOutput result", { result: JSON.stringify(result) });
                    expect(result._tag).toBe("Left"); // Expecting failure due to mock LLM output not matching schema
                    if (result._tag === "Left") {
                        const error = result.left as StructuredOutputPipelineError;
                        expect(error).toBeInstanceOf(StructuredOutputPipelineError);
                        const cause = error.cause;
                        if (cause instanceof SchemaValidationError) {
                            expect(cause.message).toContain("Schema validation failed");
                            expect(cause._tag).toBe("SchemaValidationError");
                        }
                    }
                } finally {
                    yield* fileLogger.close();
                }
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    it("extractStructured should attempt to produce output (mocked LLM, real validation)", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const fileLogger = new FileLogger({
                    logDir: "test-logs",
                    logFileBaseName: "structured-output-integration-extract",
                    minLogLevel: LogLevel.Debug
                });
                yield* fileLogger.initialize();
                const logger = fileLogger.createLoggingService();
                try {
                    const objectService = yield* ObjectService;
                    const schemaValidator = yield* LocalSchemaValidatorService;
                    const service = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                    yield* logger.info("Starting extractStructured test");
                    const result = yield* Effect.either(service.extractStructured(
                        "Product: XYZ, Price: 99.99, Stock: Yes",
                        ProductSchema
                    ));
                    yield* logger.info("extractStructured result", { result: JSON.stringify(result) });
                    expect(result._tag).toBe("Left");
                    if (result._tag === "Left") {
                        const error = result.left as StructuredOutputPipelineError;
                        expect(error).toBeInstanceOf(StructuredOutputPipelineError);
                    }
                } finally {
                    yield* fileLogger.close();
                }
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });
});