import { Effect, Layer, LogLevel } from "effect"
import * as NodePath from "node:path"
import type { LoggingServiceApi } from "../../services/core/logging/api.js"
import { FileLogger } from "../../services/core/logging/file-logger.js"

interface UserServiceApi {
    readonly createUser: (name: string) => Effect.Effect<void>
}

// Create a service that manages the FileLogger
export class AppLoggingService extends Effect.Service<LoggingServiceApi>()("AppLoggingService", {
    effect: Effect.gen(function* () {
        const logger = new FileLogger({
            logDir: NodePath.join(process.cwd(), "logs"),
            logFileBaseName: "service-app",
            maxFileSize: 5 * 1024 * 1024,
            maxBackups: 3,
            minLogLevel: LogLevel.Debug
        })

        yield* logger.initialize()
        const loggingService = logger.createLoggingService().withContext({ service: "AppLoggingService" })
        yield* Effect.addFinalizer(() =>
            Effect.succeed(logger.close())
        )
        return loggingService
    })
}) { }

// Example of using the logging service in another service
export class UserService extends Effect.Service<UserServiceApi>()("UserService", {
    effect: Effect.gen(function* () {
        const logger = (yield* AppLoggingService).withContext({ service: "AppLoggingService" });
        return {
            createUser: (name: string) => Effect.gen(function* () {
                yield* logger.info("Creating user", { name })
                try {
                    yield* Effect.promise(() => Promise.resolve())
                    yield* logger.info("User created successfully", { name })
                } catch (error) {
                    yield* logger.error("Failed to create user", error as Error)
                    return yield* Effect.fail(error)
                }
            })
        }
    }),
    dependencies: [AppLoggingService.Default]
}) { }

const MainLive = Layer.mergeAll(
    AppLoggingService.Default,
    UserService.Default
)

// Example usage
const program = Effect.gen(function* () {
    const userService = yield* UserService
    yield* userService.createUser("John Doe")
})

// Run the program
Effect.runPromise(
    program.pipe(
        Effect.provide(MainLive),
        Effect.scoped
    )
).catch(error => {
    console.error("Program failed:", error)
    process.exit(1)
}) 