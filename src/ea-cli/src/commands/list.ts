import { Command } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"
import {
  ConfigurationError,
  FileSystemError,
  PermissionError,
  mapUnknownError,
} from "../errors.js"
import { FileSystemLayer, exists } from "../services/fs.js"
import {
  type ResourceType,
  configMap,
  listConfigItems,
} from "../utils/config-helpers.js"

const resourceTypes: ResourceType[] = ["model", "provider", "rule", "toolkit"]

const listDesc =
  "List available resources in the project.\n\n" +
  "Available Resources:\n" +
  "  agent       List all agent packages in the agents/ directory\n" +
  "  model       List all models defined in models.json\n" +
  "  provider    List all providers defined in providers.json\n" +
  "  rule        List all rules defined in policy.json\n" +
  "  toolkit     List all toolkits defined in tool-registry.json\n\n" +
  "Usage:\n" +
  "  ea-cli list:agent            List all agents\n" +
  "  ea-cli list:model           List all models\n" +
  "  ea-cli list:<resource>      List other resources\n\n" +
  "Each command displays a formatted list of configured resources.\n\n" +
  "Recovery hints:\n" +
  "- If directory/file not found, run 'ea-cli init' first\n" +
  "- If permission denied, check read permissions on required files\n" +
  "- If JSON parse error, check file format and fix syntax errors"

// Helper function to check agent directory contents with Effect-based error handling
const getAgentEntries = Effect.gen(function* (_) {
  const path = yield* _(Path.Path)
  const fs = yield* _(FileSystem.FileSystem)
  const projectRoot = process.env.PROJECT_ROOT || process.cwd()
  const agentsDir = path.join(projectRoot, "agents")

  // Check if agents directory exists
  yield* exists(agentsDir).pipe(
    Effect.mapError(
      (err) =>
        new FileSystemError({
          message:
            "Failed to check if agents directory exists.\nPlease ensure you have necessary permissions.",
          path: agentsDir,
          operation: "exists",
          cause: err,
        }),
    ),
    Effect.flatMap((dirExists) =>
      dirExists
        ? Effect.succeed(undefined)
        : Effect.fail(
            new FileSystemError({
              message:
                "Agents directory not found. Run 'ea-cli init' first to create the project structure.",
              path: agentsDir,
              operation: "exists",
            }),
          ),
    ),
  )

  // Read directory contents
  const entries = yield* fs.readDirectory(agentsDir).pipe(
    Effect.mapError((err) => {
      const error = err as Error
      if (error.message?.includes("EACCES")) {
        return new PermissionError({
          message:
            "Permission denied reading agents directory.\nCheck that you have read permissions for the agents/ directory.",
          path: agentsDir,
          operation: "read",
          requiredPermission: "read",
        })
      }
      return new FileSystemError({
        message:
          "Failed to read agents directory.\nPlease ensure the directory exists and is accessible.",
        path: agentsDir,
        operation: "readDirectory",
        cause: err,
      })
    }),
  )

  return { fs, path, agentsDir, entries }
})

const listAgentCommand = Command.make("agent").pipe(
  Command.withDescription(
    "List all agents in the project. Shows the names of all agent packages " +
      "that exist in the agents/ directory.\n\n" +
      "Recovery hints:\n" +
      "- If agents directory not found, run 'ea-cli init' first\n" +
      "- If permission denied, check read permissions on agents/ directory",
  ),
  Command.withHandler(() =>
    Effect.gen(function* (_) {
      const { fs, path, agentsDir, entries } = yield* getAgentEntries

      if (entries.length === 0) {
        yield* Effect.log(
          "No agents found. Use 'ea-cli add:agent' to create a new agent.",
        )
        return Effect.succeed(undefined)
      }

      yield* Effect.log("Available agents:")

      // Process each directory entry with Effect-based error handling
      yield* Effect.forEach(entries, (entry) =>
        Effect.gen(function* () {
          const entryPath = path.join(agentsDir, entry)
          return yield* fs.readDirectory(entryPath).pipe(
            Effect.map(() => Effect.log(`- ${entry}`)),
            Effect.catchAll((err) =>
              Effect.log(
                `Warning: Could not read ${entry}: ${
                  err instanceof Error ? err.message : "Unknown error"
                }\nCheck that you have proper permissions and the directory is accessible.`,
              ),
            ),
          )
        }),
      )

      return Effect.succeed(undefined)
    }).pipe(
      Effect.catchAll((error) => Effect.fail(mapUnknownError(error))),
      Effect.provide(FileSystemLayer),
    ),
  ),
)

const getListDescription = (resourceType: ResourceType): string => {
  const descriptions = {
    model:
      "List all model configurations in the project. Shows the names/IDs of " +
      "all model entries defined in models.json.\n\n" +
      "Recovery hints:\n" +
      "- If models.json not found, run 'ea-cli init' first\n" +
      "- If permission denied, check read access to configuration/ea-config/models.json\n" +
      "- If JSON parse error, validate the file format",
    provider:
      "List all provider configurations in the project. Shows the names/IDs of " +
      "all provider entries defined in providers.json.\n\n" +
      "Recovery hints:\n" +
      "- If providers.json not found, run 'ea-cli init' first\n" +
      "- If permission denied, check read access to configuration/ea-config/providers.json\n" +
      "- If JSON parse error, validate the file format",
    rule:
      "List all rules defined in the project. Shows the names/IDs of " +
      "all rules defined in policy.json.\n\n" +
      "Recovery hints:\n" +
      "- If policy.json not found, run 'ea-cli init' first\n" +
      "- If permission denied, check read access to configuration/ea-config/policy.json\n" +
      "- If JSON parse error, validate the file format",
    toolkit:
      "List all toolkits defined in the project. Shows the names/IDs of " +
      "all toolkits defined in tool-registry.json.\n\n" +
      "Recovery hints:\n" +
      "- If tool-registry.json not found, run 'ea-cli init' first\n" +
      "- If permission denied, check read access to configuration/ea-config/tool-registry.json\n" +
      "- If JSON parse error, validate the file format",
  }

  return descriptions[resourceType]
}

// Helper to list config items with Effect-based error handling
const listConfigItemsWithErrorHandling = (resourceType: ResourceType) =>
  Effect.gen(function* () {
    return yield* listConfigItems(resourceType).pipe(
      Effect.tap((items) =>
        items.length === 0
          ? Effect.log(
              `No ${resourceType}s found. Use 'ea-cli add:${resourceType}' to add one.`,
            )
          : Effect.gen(function* () {
              yield* Effect.log(`Available ${resourceType}s:`)
              yield* Effect.forEach(items, (item) => {
                // Extract the name using the config mapping
                const config = configMap[resourceType]
                const itemName = item[config.itemNameKey] || "Unknown Item"
                return Effect.log(`- ${itemName}`)
              })
            }),
      ),
      Effect.catchAll((err) => {
        if (err instanceof Error) {
          if (err.message.includes("ENOENT")) {
            return Effect.fail(
              new ConfigurationError({
                message: `${resourceType} configuration file not found.\nRun 'ea-cli init' to create required configuration files.`,
                configPath: `configuration/ea-config/${resourceType}s.json`,
                errorType: "missing",
              }),
            )
          }
          if (err.message.includes("EACCES")) {
            return Effect.fail(
              new PermissionError({
                message: `Permission denied reading ${resourceType} configuration.\nCheck that you have read permissions for configuration/ea-config/${resourceType}s.json`,
                path: `configuration/ea-config/${resourceType}s.json`,
                operation: "read",
                requiredPermission: "read",
              }),
            )
          }
          if (err.message.includes("JSON")) {
            return Effect.fail(
              new ConfigurationError({
                message: `Invalid JSON in ${resourceType} configuration.\nCheck the file format and fix any syntax errors.`,
                configPath: `configuration/ea-config/${resourceType}s.json`,
                errorType: "parse",
                cause: err,
              }),
            )
          }
        }
        return Effect.fail(mapUnknownError(err))
      }),
    )
  })

const listCommands = resourceTypes.map((resourceType) =>
  Command.make(resourceType).pipe(
    Command.withDescription(getListDescription(resourceType)),
    Command.withHandler(() => listConfigItemsWithErrorHandling(resourceType)),
  ),
)

export const listCommand = Command.make("list", {}).pipe(
  Command.withDescription(listDesc),
  Command.withSubcommands([listAgentCommand, ...listCommands]),
)
