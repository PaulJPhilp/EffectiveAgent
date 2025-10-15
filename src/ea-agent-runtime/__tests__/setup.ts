import * as NodePath from "node:path"
import { PlatformLogger } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { config as loadEnv } from "dotenv"
import { Effect, Logger } from "effect"

loadEnv();

// Provide safe defaults for tests so services that validate presence of API
// keys during initialization don't fail in local/test environments.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-openai-key";
process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "test-google-key";

const logPath = NodePath.join(process.cwd(), "test-logs", "agent-runtime-test.log")
const fmtLogger = Logger.logfmtLogger

await Effect.runPromise(
    Effect.scoped(fmtLogger.pipe(
        PlatformLogger.toFile(logPath)
    ).pipe(Effect.provide(NodeFileSystem.layer)))
).then(fileLogger => {
    Logger.replace(Logger.defaultLogger, fileLogger)
})
