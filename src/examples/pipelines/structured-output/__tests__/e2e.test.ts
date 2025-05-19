import { ConfigurationService } from "@/services/core/configuration/service.js";
import { FileLogger } from "@/services/core/logging/file-logger.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import { LocalSchemaValidatorService, makeStructuredOutputPipelineService } from "../service.js";

const UserProfileSchema = S.Struct({
    username: S.String,
    email: S.String,
    active: S.Boolean
});
type UserProfile = S.Schema.Type<typeof UserProfileSchema>;

describe("StructuredOutputPipeline E2E Tests", () => {
    it("should extract a valid user profile", async () => {
        const fileLogger = new FileLogger({
            logDir: "test-logs",
            logFileBaseName: "structured-output-e2e-profile"
        });
        await fileLogger.initialize();
        const logger = fileLogger.createLoggingService();
        const input = "name: John Doe\nemail: john@example.com\nactive: true";
        try {
            await Effect.runPromise(
                Effect.gen(function* () {
                    const objectService = yield* ObjectService;
                    const schemaValidator = yield* LocalSchemaValidatorService;
                    const pipeline = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                    yield* logger.info("Starting structured output test", { input });
                    const result = yield* pipeline.extractStructured(input, UserProfileSchema);
                    yield* logger.info("Test completed successfully", { result });
                    expect(result).toEqual({
                        username: "John Doe",
                        email: "john@example.com",
                        active: true
                    });
                }).pipe(
                    Effect.provide(ObjectService.Default),
                    Effect.provide(LocalSchemaValidatorService.Default),
                    Effect.provide(ConfigurationService.Default),
                    Effect.provide(NodeFileSystem.layer)
                )
            );
        } finally {
            await Effect.runPromise(fileLogger.close());
        }
    });

    it("extractStructured should extract user profile from text with real LLM", async () => {
        const fileLogger = new FileLogger({
            logDir: "test-logs",
            logFileBaseName: "structured-output-e2e-extract"
        });
        await fileLogger.initialize();
        const logger = fileLogger.createLoggingService();
        const text = `Here is a user profile for John Doe:\n    - Username: john.doe\n    - Email: john@example.com\n    - Status: Active (true)`;
        try {
            await Effect.runPromise(
                Effect.gen(function* () {
                    const objectService = yield* ObjectService;
                    const schemaValidator = yield* LocalSchemaValidatorService;
                    const pipeline = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                    yield* logger.info("Starting extractStructured test", { text });
                    const result = yield* pipeline.extractStructured(text, UserProfileSchema);
                    yield* logger.info("Test completed successfully", { result });
                    expect(result.username).toBe("john.doe");
                    expect(result.email).toBe("john@example.com");
                    expect(result.active).toBe(true);
                }).pipe(
                    Effect.provide(LocalSchemaValidatorService.Default),
                    Effect.provide(ObjectService.Default),
                    Effect.provide(ConfigurationService.Default),
                    Effect.provide(NodeFileSystem.layer)
                )
            );
        } finally {
            await Effect.runPromise(fileLogger.close());
        }
    });
}); 