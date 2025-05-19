import { PlatformLogger } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Layer, Logger } from "effect"
import * as NodePath from "node:path"

/**
 * Creates a Layer that writes logs to a file for use in tests.
 * @param logFileName The name of the log file (relative to ./test-logs)
 */
export async function fileTestLoggerLayer(
    logFileName: string
): Promise<Layer.Layer<never, never, never>> {
    const logPath = NodePath.join(process.cwd(), "test-logs", logFileName)
    const fmtLogger = Logger.logfmtLogger
    const fileLogger = await Effect.runPromise(
        Effect.scoped(fmtLogger.pipe(
            PlatformLogger.toFile(logPath)
        ).pipe(Effect.provide(NodeFileSystem.layer)))
    )
    // Provide the logger as a Layer for use in tests
    return Logger.replaceScoped(Logger.defaultLogger, Effect.succeed(fileLogger))
} 