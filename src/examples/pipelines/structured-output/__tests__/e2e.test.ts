import { ModelFile } from "@/services/ai/model/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderClient } from "@/services/ai/provider/client.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { FileLogger } from "@/services/core/logging/file-logger.js";
import { LoggingService } from "@/services/core/logging/service.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { FileSystem } from "@effect/platform";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import "dotenv/config";
import { Effect, Either, Layer, LogLevel, ParseResult, Schema } from "effect";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LocalSchemaValidatorService, makeStructuredOutputPipelineService } from "../service.js";
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY);

process.env.PROVIDERS_CONFIG_PATH = path.resolve(__dirname, '../../../../config/providers.json');
process.env.MODELS_CONFIG_PATH = path.resolve(__dirname, '../../../../config/models.json');

const UserProfileSchema = Schema.Struct({
    username: Schema.String,
    email: Schema.String,
    active: Schema.Boolean
});
type UserProfile = Schema.Schema.Type<typeof UserProfileSchema>;

const fileLogger = new FileLogger({
    logDir: "test-logs",
    logFileBaseName: "structured-output-e2e-global",
    minLogLevel: LogLevel.Debug
});
await Effect.runPromise(fileLogger.initialize());
const logger = fileLogger.createLoggingService().withContext({ service: "StructuredOutputPipelineE2E" });

const LoggingServiceLayer = Layer.succeed(LoggingService, logger);


describe("StructuredOutputPipeline E2E Tests", () => {
    beforeAll(async () => {
        // Existing log file cleanup
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const logFile = "test-logs/structured-output-e2e-global.log";
                const exists = yield* fs.exists(logFile);
                if (exists) {
                    yield* fs.remove(logFile);
                }
            }).pipe(
                Effect.provide(NodeFileSystem.layer)
            )
        );
        // New: Try to read the raw models config file and print contents, then validate with ModelFile schema
        await Effect.runPromise(
            Effect.gen(function* () {
                const fs = yield* FileSystem.FileSystem;
                const configService = yield* ConfigurationService;
                const modelsConfigPath = process.env.MODELS_CONFIG_PATH!;
                const fileContent = yield* fs.readFileString(modelsConfigPath, "utf8");
                console.log("[Test beforeAll] Raw models.json content:\n", fileContent);
                // Try to load with ModelFile schema
                const loadResult = yield* configService.loadConfig({ filePath: modelsConfigPath, schema: ModelFile }).pipe(Effect.either);
                if (Either.isRight(loadResult)) {
                    console.log("[Test beforeAll] ModelFile schema loaded config:", loadResult.right);
                } else {
                    const error = loadResult.left;
                    console.error("[Test beforeAll] Error loading models config with ModelFile schema:", error);
                    if (error._tag === "ConfigValidationError" && error.validationError) {
                        console.error("[Test beforeAll] Validation details:\n" + ParseResult.TreeFormatter.formatErrorSync(error.validationError));
                    }
                    console.dir(error, { depth: null });
                }
            }).pipe(
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    afterAll(async () => {
        await Effect.runPromise(fileLogger.close());
    });

    it("should extract a valid user profile", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const objectService = yield* ObjectService;
                const schemaValidator = yield* LocalSchemaValidatorService;
                const pipeline = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                const input = "name: John Doe\nemail: john@example.com\nactive: true";
                yield* logger.info("Starting structured output test", { input });
                const result = yield* pipeline.extractStructured(input, UserProfileSchema, { modelId: "gpt-4o" });
                yield* logger.info("Test completed successfully", { result });
                expect(result).toEqual({
                    username: "John Doe",
                    email: "john@example.com",
                    active: true
                });
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ModelService.Default),
                Effect.provide(ProviderService.Default),
                Effect.provide(LoggingServiceLayer),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    it("extractStructured should extract user profile from text with real LLM", async () => {
        await Effect.runPromise(
            Effect.gen(function* () {
                const objectService = yield* ObjectService;
                const schemaValidator = yield* LocalSchemaValidatorService;
                const pipeline = makeStructuredOutputPipelineService(logger, objectService, schemaValidator);
                const text = `Here is a user profile for John Doe:\n    - Username: john.doe\n    - Email: john@example.com\n    - Status: Active (true)`;
                yield* logger.info("Starting extractStructured test", { text });
                const result = yield* pipeline.extractStructured(text, UserProfileSchema, { modelId: "gpt-4o" });
                yield* logger.info("Test completed successfully", { result });
                expect(result.username).toBe("john.doe");
                expect(result.email).toBe("john@example.com");
                expect(result.active).toBe(true);
            }).pipe(
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(ObjectService.Default),
                Effect.provide(ModelService.Default),
                Effect.provide(ProviderService.Default),
                Effect.provide(LoggingServiceLayer),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });
}); 