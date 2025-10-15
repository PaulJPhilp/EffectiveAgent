import { PlatformLogger } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { config as loadEnv } from "dotenv"
import { Effect, Logger } from "effect"
import * as NodePath from "node:path"

// Ensure .env is loaded for tests so provider integration tests can find
// API key environment variables when running locally. These are fallbacks
// and should not be used in production.
loadEnv();

// Provide safe defaults for CI/local runs where API keys are not required
// (these defaults are intentionally non-functional and exist to satisfy
// service initialization checks in unit/integration tests that don't hit
// external providers).
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-openai-key";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "test-google-key";

const logPath = NodePath.join(process.cwd(), "test-logs", "simple-test.log")
const fmtLogger = Logger.logfmtLogger

await Effect.runPromise(
    Effect.scoped(fmtLogger.pipe(
        PlatformLogger.toFile(logPath)
    ).pipe(Effect.provide(NodeFileSystem.layer)))
).then(fileLogger => {
    Logger.replace(Logger.defaultLogger, fileLogger)
}) 