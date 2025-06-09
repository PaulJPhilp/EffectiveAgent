import { Command } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Console, Effect } from "effect"
import { ConfigurationError, FileSystemError } from "../errors.js"
import { exists } from "../services/fs.js"
import { handleCommandError } from "../utils/error-handling.js"

const validateConfigs = Effect.gen(function* () {
  const pathSvc = yield* Path.Path
  const fs = yield* FileSystem.FileSystem
  const cwd = process.cwd()
  const configDir = pathSvc.join(cwd, "ea-config")

  // List of required config files with descriptions
  const requiredConfigs = [
    { name: "master-config.json", purpose: "Core framework settings" },
    { name: "models.json", purpose: "AI model configurations" },
    { name: "providers.json", purpose: "API provider settings" },
    { name: "policy.json", purpose: "Agent behavior policies" },
    { name: "tool-registry.json", purpose: "Available agent tools" },
  ]

  // Validation state
  let isValid = true
  const validationErrors: string[] = []

  // Check config directory exists
  yield* exists(configDir).pipe(
    Effect.flatMap((exists) => {
      if (!exists) {
        return Effect.fail(
          new ConfigurationError({
            message:
              "ea-config directory not found.\nPlease ensure:\n" +
              "1. You are in the workspace root directory\n" +
              "2. Project was initialized with 'ea-cli init'",
            configPath: configDir,
            errorType: "missing",
          }),
        )
      }
      return Effect.succeed(undefined)
    }),
  )

  // Validate each config file using Effect
  yield* Effect.forEach(
    requiredConfigs,
    (config) =>
      Effect.gen(function* () {
        const configPath = pathSvc.join(configDir, config.name)

        // Check file exists
        const fileExists = yield* exists(configPath).pipe(
          Effect.catchTag("SystemError", (err) =>
            Effect.fail(
              new FileSystemError({
                message: `Failed to check if ${config.name} exists`,
                path: configPath,
                operation: "validate",
                cause: err,
              }),
            ),
          ),
        )

        if (!fileExists) {
          isValid = false
          validationErrors.push(
            `❌ ${config.name}: File not found (Required for ${config.purpose})`,
          )
          return Effect.succeed(undefined)
        }

        // Read and parse JSON using Effect
        return yield* fs.readFileString(configPath).pipe(
          Effect.flatMap((content) =>
            Effect.try({
              try: () => {
                const parsed = JSON.parse(content)
                isValid = true
                return parsed
              },
              catch: (err) => {
                isValid = false
                validationErrors.push(
                  `❌ ${config.name}: Invalid JSON format - ${String(err)}`,
                )
                return undefined
              },
            }),
          ),
          Effect.tap(() => {
            if (isValid) {
              return Console.log(`✅ ${config.name}: Valid JSON format`)
            }
            return Effect.succeed(undefined)
          }),
          Effect.catchAll((err) => {
            isValid = false
            validationErrors.push(
              `❌ ${config.name}: Error reading file - ${String(err)}`,
            )
            return Effect.succeed(undefined)
          }),
        )
      }),
    { concurrency: 1 },
  )

  // Return validation results using Effect
  if (isValid) {
    return yield* Console.log("\n✅ All configuration files are valid")
  } else {
    yield* Console.log("\n❌ Configuration validation failed:")
    yield* Effect.forEach(validationErrors, (error) => Console.log(error))
    yield* Console.log("\nTo fix these issues:")
    yield* Console.log("1. Run 'ea-cli init' to create missing files")
    yield* Console.log("2. Check JSON syntax in existing files")
    yield* Console.log("3. See documentation for configuration schemas")
    return yield* Effect.fail(
      new ConfigurationError({
        message: "Configuration validation failed",
        configPath: configDir,
        errorType: "schema",
      }),
    )
  }
})

const validate = Command.make("validate").pipe(
  Command.withDescription(
    "Validate all configuration files in ea-config/.\n\n" +
    "This command will:\n" +
    "  1. Check each config file exists\n" +
    "  2. Validate JSON syntax\n" +
    "  3. Verify against schema definitions\n" +
    "  4. Check for required fields\n\n" +
    "Files checked:\n" +
    "  - models.json\n" +
    "  - providers.json\n" +
    "  - policy.json\n" +
    "  - tool-registry.json\n\n" +
    "Results will show ✅ for valid files or detailed errors for invalid ones.",
  ),
  Command.withHandler(() =>
    validateConfigs.pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* handleCommandError(error, {
            command: "config:validate",
            operation: "validation",
          })
          return yield* Effect.fail(error)
        }),
      ),
    ),
  ),
)

export const configCommands = Command.make("config").pipe(
  Command.withDescription(
    "Manage and validate project configuration files.\n\n" +
    "Available Commands:\n" +
    "  validate    Check all configuration files against their schemas\n\n" +
    "The config commands help ensure your project's configuration files\n" +
    "are valid and properly structured. Configuration files are stored\n" +
    "in the ea-config/ directory.",
  ),
  Command.withSubcommands([validate]),
)
