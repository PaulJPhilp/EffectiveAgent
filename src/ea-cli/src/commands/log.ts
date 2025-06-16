import { Command, Options, Prompt } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"
import {
  ConfigurationError,
  FileSystemError,
  PermissionError,
} from "../errors.js"
import { exists } from "../services/fs.js"
import { handleCommandError } from "../utils/error-handling.js"

export const viewCommand = Command.make("view", {
  head: Options.integer("head").pipe(
    Options.withDescription("Display first N lines of the log"),
    Options.optional,
  ),
  tail: Options.integer("tail").pipe(
    Options.withDescription("Display last N lines of the log"),
    Options.optional,
  ),
}).pipe(
  Command.withDescription(
    "Display log file contents. Supports --head N or --tail N for partial viewing.\n" +
      "The log file path is configured in master-config.json under logging.filePath.\n\n" +
      "Recovery hints:\n" +
      "- If config not found, run 'ea-cli init' first\n" +
      "- If permission denied, check file access permissions\n" +
      "- If log file missing, it will be created when logs are generated",
  ),
  Command.withHandler(({ head, tail }) =>
    Effect.gen(function* () {
      const pathSvc = yield* Path.Path
      const fs = yield* FileSystem.FileSystem
      const configPath = pathSvc.join(
        process.cwd(),
        "ea-config/master-config.json",
      )

      // Check config exists with helpful error
      const configExists = yield* exists(configPath).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message:
                "Failed to check if master-config.json exists.\nPlease ensure you have necessary permissions.",
              path: configPath,
              operation: "exists",
              cause: err,
            }),
        ),
      )

      if (!configExists) {
        return yield* Effect.fail(
          new ConfigurationError({
            message:
              "Master configuration file not found.\nRun 'ea-cli init' to create required configuration files.",
            configPath,
            errorType: "missing",
          }),
        )
      }

      // Read and parse config with validation
      const configContent = yield* fs.readFileString(configPath).pipe(
        Effect.mapError((err) => {
          const error = err as Error
          if (error.message?.includes("EACCES")) {
            return new PermissionError({
              message:
                "Permission denied reading master configuration.\nCheck file permissions for master-config.json",
              path: configPath,
              operation: "read",
              requiredPermission: "read",
            })
          }
          return new FileSystemError({
            message:
              "Failed to read master configuration.\nPlease ensure the file is accessible.",
            path: configPath,
            operation: "read",
            cause: err,
          })
        }),
      )

      // Parse configuration with improved error handling
      const config = yield* Effect.try({
        try: () => JSON.parse(configContent),
        catch: (err) =>
          new ConfigurationError({
            message:
              "Invalid JSON in master configuration.\nPlease check the file format and fix any syntax errors.",
            configPath,
            errorType: "parse",
            cause: err,
          }),
      })

      if (!config.logging?.filePath) {
        return yield* Effect.fail(
          new ConfigurationError({
            message:
              "Log file path not configured.\nAdd logging.filePath to master-config.json",
            configPath,
            errorType: "schema",
          }),
        )
      }

      const logPath = config.logging.filePath

      // Check log file exists with clear context
      const logExists = yield* exists(logPath).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message:
                "Failed to check log file. Please ensure the logs directory is accessible.",
              path: logPath,
              operation: "exists",
              cause: err,
            }),
        ),
      )

      if (!logExists) {
        yield* Console.log(
          "Log file does not exist yet. It will be created when logs are generated.\nRun any agent command to generate logs.",
        )
        return
      }

      // Read log file with improved error handling
      const content = yield* fs.readFileString(logPath).pipe(
        Effect.map((content) => {
          const lines = content.split("\n")

          return Option.match(head, {
            onNone: () =>
              Option.match(tail, {
                onNone: () => content,
                onSome: (tailCount) => lines.slice(-tailCount).join("\n"),
              }),
            onSome: (headCount) => lines.slice(0, headCount).join("\n"),
          })
        }),
        Effect.mapError((err) => {
          const error = err as Error
          if (error.message?.includes("EACCES")) {
            return new PermissionError({
              message:
                "Permission denied reading log file.\nCheck file permissions and ensure you have read access.",
              path: logPath,
              operation: "read",
              requiredPermission: "read",
            })
          }
          return new FileSystemError({
            message:
              "Failed to read log file.\nPlease ensure the file is accessible.",
            path: logPath,
            operation: "read",
            cause: err,
          })
        }),
      )

      // Print log content with empty file handling
      yield* Console.log(
        content || "Log file is empty. Run an agent to generate logs.",
      )
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* handleCommandError(error, {
            command: "log:view",
            operation: "viewing",
          })
          return yield* Effect.fail(error)
        }),
      ),
    ),
  ),
)

export const clearCommand = Command.make("clear", {}, () =>
  Effect.gen(function* (_) {
    const fs = yield* FileSystem.FileSystem
    const pathSvc = yield* Path.Path
    const configPath = pathSvc.join(
      process.cwd(),
      "ea-config/master-config.json",
    )

    // Check config exists with helpful context
    const configExists = yield* exists(configPath).pipe(
      Effect.mapError(
        (err) =>
          new FileSystemError({
            message:
              "Failed to check if master-config.json exists.\nPlease ensure you have necessary permissions.",
            path: configPath,
            operation: "exists",
            cause: err,
          }),
      ),
    )

    if (!configExists) {
      return yield* Effect.fail(
        new ConfigurationError({
          message:
            "Master configuration file not found.\nRun 'ea-cli init' to create required configuration files.",
          configPath,
          errorType: "missing",
        }),
      )
    }

    // Read and parse config with validation
    const configContent = yield* fs.readFileString(configPath).pipe(
      Effect.mapError((err) => {
        const error = err as Error
        if (error.message?.includes("EACCES")) {
          return new PermissionError({
            message:
              "Permission denied reading master configuration.\nCheck file permissions for master-config.json",
            path: configPath,
            operation: "read",
            requiredPermission: "read",
          })
        }
        return new FileSystemError({
          message:
            "Failed to read master configuration.\nPlease ensure the file is accessible.",
          path: configPath,
          operation: "read",
          cause: err,
        })
      }),
    )

    // Parse configuration with proper error handling
    const config = yield* Effect.try({
      try: () => JSON.parse(configContent),
      catch: (err) =>
        new ConfigurationError({
          message:
            "Invalid JSON in master configuration.\nPlease check the file format and fix any syntax errors.",
          configPath,
          errorType: "parse",
          cause: err,
        }),
    })

    if (!config.logging?.filePath) {
      return yield* Effect.fail(
        new ConfigurationError({
          message:
            "Log file path not configured.\nAdd logging.filePath to master-config.json",
          configPath,
          errorType: "schema",
        }),
      )
    }

    const logPath = config.logging.filePath

    // Get confirmation with clear warning message
    const confirmation = yield* Prompt.confirm({
      message: `Are you sure you want to clear the log file at: ${logPath}?`,
    })

    if (!confirmation) {
      yield* Console.log("Log clear operation cancelled.")
      return
    }

    // Check if log file exists
    const logFileExists = yield* exists(logPath).pipe(
      Effect.mapError(
        (err) =>
          new FileSystemError({
            message:
              "Failed to check if log file exists.\nPlease ensure you have necessary permissions.",
            path: logPath,
            operation: "exists",
            cause: err,
          }),
      ),
    )

    if (!logFileExists) {
      // Non-existent log file is not an error, just inform
      yield* Console.log(
        `Log file not found at: ${logPath}. Nothing to clear.\nA new log file will be created when logs are generated.`,
      )
      return
    }

    // Clear the log file with proper error handling
    yield* fs.writeFileString(logPath, "").pipe(
      Effect.mapError((err) => {
        if (err instanceof Error && err.message?.includes("EACCES")) {
          return new PermissionError({
            message:
              "Permission denied clearing log file.\nCheck write permissions for the log file.",
            path: logPath,
            operation: "write",
            requiredPermission: "write",
          })
        }
        return new FileSystemError({
          message:
            "Failed to clear log file.\nPlease ensure you have proper access and the file is not in use.",
          path: logPath,
          operation: "write",
          cause: err,
        })
      }),
    )

    yield* Console.log(`Log file cleared successfully: ${logPath}`)
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* handleCommandError(error, {
          command: "log:clear",
          operation: "clearing",
        })
        return yield* Effect.fail(error)
      }),
    ),
  ),
).pipe(
  Command.withDescription(
    "Clear the contents of the project's log file.\n\n" +
      "This command will:\n" +
      "1. Show the target log file path\n" +
      "2. Prompt for confirmation\n" +
      "3. Clear the file if confirmed\n\n" +
      "The log file path is configured in master-config.json.\n\n" +
      "Recovery hints:\n" +
      "- If config not found, run 'ea-cli init' first\n" +
      "- If permission denied, check file write permissions\n" +
      "- If log file missing, it will be created when needed",
  ),
)

export const logCommands = Command.make("log").pipe(
  Command.withDescription(
    "View and manage the project's log files.\n\n" +
      "Available Commands:\n" +
      "  view     Display log file contents (supports --head/--tail)\n" +
      "  clear    Clear the log file (requires confirmation)\n\n" +
      "The log file path is configured in master-config.json under logging.filePath.\n" +
      "Use 'ea-cli log:<command> --help' for more information about a command.",
  ),
  Command.withSubcommands([viewCommand, clearCommand]),
  Command.provide(NodeContext.layer),
)
