import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { Effect, Logger, Schema as S } from "effect";
import * as Layer from "effect/Layer";
import * as NodeFs from "node:fs/promises";
import * as NodePath from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setup } from "./setup.js";

function makeLogger(name: string) {
    const fmtLogger = Logger.logfmtLogger
    const fileLogger = fmtLogger.pipe(
        PlatformLogger.toFile(NodePath.join(process.cwd(), "test-logs", `${name}.log`))
    )
    return Logger.replaceScoped(Logger.defaultLogger, fileLogger).pipe(Layer.provide(NodeFileSystem.layer))
}


// Re-export Schema for convenience
const Schema = S;

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { LoggingService } from "@/services/core/logging/service.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { ExecutiveService } from "@/services/pipeline/shared/service.js";
import { PlatformLogger } from "@effect/platform";
import { PlatformError } from "@effect/platform/Error";
import { VercelLlmService } from "../llm/service.js";
import {
    LocalSchemaValidatorService,
    StructuredOutputPipelineService
} from "../service.js";

// Test configuration
const TEST_LOG_DIR = NodePath.join(process.cwd(), "test-logs");
const TEST_LOG_FILE = "e2e-test";

// Get the LoggingService instance for tests
const getTestLogger = () => Effect.gen(function* () {
    return yield* LoggingService;
});

// Clean up test logs
const cleanupTestLogs = () => {
    return Effect.promise(async () => {
        try {
            await NodeFs.rm(TEST_LOG_DIR, { recursive: true, force: true });
        } catch (error) {
            console.error("Failed to clean up test logs:", error);
        }
    });
};



const UserProfileSchema = S.Struct({
    username: S.String,
    email: S.String,
    active: S.Boolean
});

type UserProfile = S.Schema.Type<typeof UserProfileSchema>;


describe("StructuredOutputPipeline E2E Tests", () => {
    let testNumber = 0;
    let fileLogger: Layer.Layer<never, PlatformError, never>
    // Setup before all tests
    beforeAll(async () => {
        // Setup test environment
        await setup();
        const logger = makeLogger(`e2e-test-${testNumber}`);
        fileLogger = logger;
        testNumber++

        await Effect.runPromise(Effect.provide(Effect.succeed(logger), logger))
    });

    // Close logger after all tests
    afterAll(async () => {
        // Close the file logger if it was created
        if (fileLogger) {
            await Effect.runPromise(Effect.provide(Effect.succeed(fileLogger), fileLogger))
        }
    });

    it('should extract a valid user profile', async () => {
        const logger = makeLogger("e2e-test");
        const input = "name: John Doe\nemail: john@example.com\nactive: true";

        // Log test start
        await Effect.runPromise(Effect.logInfo("Starting structured output test", { input }));

        // Run the pipeline
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const pipeline = yield* StructuredOutputPipelineService;
                return yield* pipeline.extractStructured(input, UserProfileSchema);
            }).pipe(
                Effect.provide(ObjectService.Default),
                Effect.provide(ExecutiveService.Default),
                Effect.provide(StructuredOutputPipelineService.Default),
                Effect.provide(LocalSchemaValidatorService.Default),
                Effect.provide(VercelLlmService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );

        // Log result
        await Effect.runPromise(Effect.logInfo("Test completed successfully", { result }));

        // Verify output
        expect(result).toEqual({
            username: "John Doe",
            email: "john@example.com",
            active: true
        });
    });

    it("extractStructured should extract user profile from text with real LLM", async () => {

        // Apply toFile to write logs to "/tmp/log.txt"
        const fileLogger = makeLogger("e2e-test-extractStructured");


        const text = `Here is a user profile for John Doe:
            - Username: john.doe
            - Email: john@example.com
            - Status: Active (true)`;

        // Run the pipeline with retry and timeout
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                yield* Effect.logInfo("Starting extractStructured test", { test: "extractStructured", text })
                const executive = yield* ExecutiveService
                const service = yield* StructuredOutputPipelineService
                const output = yield* executive.execute(
                    service.extractStructured(text, UserProfileSchema),
                    {
                        maxRetries: 2,
                        timeoutMs: 15000
                    }
                )
                yield* Effect.logDebug("Received result from extractStructured", { test: "extractStructured", result: output })
                return output
            }).pipe(
                Effect.provide(
                    Layer.mergeAll(
                        ExecutiveService.Default,
                        ObjectService.Default,
                        StructuredOutputPipelineService.Default,
                        LocalSchemaValidatorService.Default,
                        VercelLlmService.Default
                    ).pipe(
                        Layer.provide(ConfigurationService.Default),
                        Layer.provide(NodeFileSystem.layer),
                        Layer.provide(fileLogger)
                    )
                )
            )
        )

        // Verify output
        expect(result.username).toBe("john.doe")
        expect(result.email).toBe("john@example.com")
        expect(result.active).toBe(true)
    });
}); 