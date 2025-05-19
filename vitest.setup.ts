import { PlatformLogger } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect, Logger } from "effect"
import * as NodePath from "node:path"

const logPath = NodePath.join(process.cwd(), "test-logs", "simple-test.log")
const fmtLogger = Logger.logfmtLogger

await Effect.runPromise(
    Effect.scoped(fmtLogger.pipe(
        PlatformLogger.toFile(logPath)
    ).pipe(Effect.provide(NodeFileSystem.layer)))
).then(fileLogger => {
    Logger.replace(Logger.defaultLogger, fileLogger)
}) 