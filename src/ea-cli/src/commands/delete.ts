import { Args, Command, Prompt } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Console, Effect } from "effect"
import {
  ConfigurationError,
  FileSystemError,
  PermissionError,
  ResourceNotFoundError,
  ValidationError,
  mapUnknownError,
} from "../errors.js"
import { exists } from "../services/fs.js"
import { type ResourceType, deleteConfigItem } from "../utils/config-helpers.js"
import { handleCommandError } from "../utils/error-handling.js"

const itemNameArg = Args.text()

const validateItemName = (name: string): Effect.Effect<void, ValidationError> =>
  Effect.succeed(void 0).pipe(
    Effect.tap(() => {
      if (!/^[a-z0-9-]+$/.test(name)) {
        return Effect.fail(
          new ValidationError({
            message:
              "Name can only contain lowercase letters, numbers, and hyphens",
            field: "name",
          }),
        )
      }
      if (name.length < 1 || name.length > 214) {
        return Effect.fail(
          new ValidationError({
            message: "Name must be between 1 and 214 characters",
            field: "name",
          }),
        )
      }
      return Effect.succeed(void 0)
    }),
  )

const deleteAgentCommand = Command.make("agent", { args: itemNameArg }).pipe(
  Command.withDescription(
    "Delete an agent from the project. This will remove the entire agent directory " +
      "and all its contents from the agents/ directory.\n\n" +
      "⚠️ WARNING: This is a destructive operation that cannot be undone.\n" +
      "A confirmation prompt will be shown before deletion.",
  ),
  Command.withHandler((options) =>
    Effect.gen(function* () {
      const agentName = options.args

      // Validate agent name format
      yield* validateItemName(agentName)

      const pathSvc = yield* Path.Path
      const fs = yield* FileSystem.FileSystem
      const agentPath = pathSvc.join(process.cwd(), "agents", agentName)

      // Check if agent exists with Effect-based error handling
      yield* exists(agentPath).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message: "Failed to check if agent exists",
              path: agentPath,
              operation: "exists",
              cause: err,
            }),
        ),
        Effect.flatMap((exists) =>
          exists
            ? Effect.succeed(void 0)
            : Effect.fail(
                new ResourceNotFoundError({
                  resourceType: "agent",
                  resourceName: agentName,
                  message: `Agent '${agentName}' not found in agents/ directory`,
                }),
              ),
        ),
      )

      // Ask for confirmation with clear warning
      const confirmed = yield* Prompt.confirm({
        message: `⚠️  Are you sure you want to delete agent '${agentName}'?\nThis will permanently remove all agent files including:\n- Source code\n- Configuration\n- Dependencies\n- Test files\nThis action cannot be undone.`,
        initial: false,
      })

      if (!confirmed) {
        return yield* Console.log("Deletion cancelled")
      }

      // Delete agent directory with Effect-based error handling and retries
      yield* fs.remove(agentPath, { recursive: true }).pipe(
        Effect.retry({
          times: 3,
          while: (err) => {
            const error = err as Error
            return (
              error.message?.includes("EBUSY") ||
              error.message?.includes("EAGAIN") ||
              error.message?.includes("ENOTEMPTY")
            )
          },
        }),
        Effect.mapError((err) => {
          if (err instanceof Error) {
            if (err.message?.includes("EACCES")) {
              return new PermissionError({
                message:
                  "Permission denied deleting agent directory.\n" +
                  "Please check:\n" +
                  "1. File system permissions\n" +
                  "2. Owner/group settings\n" +
                  "3. Read-only flags",
                path: agentPath,
                operation: "delete",
                requiredPermission: "write",
              })
            }
            if (err.message?.includes("ENOENT")) {
              return new ResourceNotFoundError({
                resourceType: "agent",
                resourceName: agentName,
                message:
                  "Agent directory disappeared during deletion.\nPossibly deleted by another process.",
              })
            }
          }
          return new FileSystemError({
            message:
              "Failed to delete agent directory.\n" +
              "Please check:\n" +
              "1. If any files are locked\n" +
              "2. If files are open in other programs\n" +
              "3. If you have sufficient permissions",
            path: agentPath,
            operation: "delete",
            cause: err,
          })
        }),
      )

      // Log success with resource cleanup confirmation
      yield* Console.log(
        `✅ Agent '${agentName}' deleted successfully\nAll resources cleaned up:\n- Source code files\n- Configuration files\n- Dependencies`,
      )
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* handleCommandError(error, {
            command: "delete:agent",
            operation: "deletion",
          })
          return yield* Effect.fail(error)
        }),
      ),
    ),
  ),
)

const resourceTypes: ResourceType[] = ["model", "provider", "rule", "toolkit"]

const makeDeleteConfigCommand = (type: ResourceType) => {
  const desc = {
    model: "Delete a model configuration from models.json",
    provider: "Delete a provider configuration from providers.json",
    rule: "Delete a rule configuration from policy.json",
    toolkit: "Delete a toolkit configuration from tool-registry.json",
  }

  return Command.make(type, { args: itemNameArg }).pipe(
    Command.withDescription(
      `${desc[type]}\n\n⚠️ WARNING: This is a destructive operation that cannot be undone.\nA confirmation prompt will be shown before deletion.`,
    ),
    Command.withHandler((options) =>
      Effect.gen(function* () {
        const itemName = options.args

        // Validate name format
        yield* validateItemName(itemName)

        // Ask for confirmation with clear context
        const confirmed = yield* Prompt.confirm({
          message: `⚠️  Are you sure you want to delete ${type} '${itemName}'?\nThis will remove the ${type} configuration from ea-config/${type}s.json.\nThis action cannot be undone.`,
          initial: false,
        })

        if (!confirmed) {
          return yield* Console.log("Deletion cancelled")
        }

        // Delete config item with Effect-based error handling
        return yield* deleteConfigItem(type, itemName).pipe(
          Effect.flatMap(() =>
            Console.log(`✅ ${type} '${itemName}' deleted successfully`),
          ),
          Effect.catchAll((error) => {
            if (error instanceof Error) {
              if (error.message.includes("not found")) {
                return Effect.fail(
                  new ResourceNotFoundError({
                    resourceType: type,
                    resourceName: itemName,
                    message: `${type} '${itemName}' not found in configuration`,
                  }),
                )
              }
              if (error.message.includes("EACCES")) {
                return Effect.fail(
                  new PermissionError({
                    message: `Permission denied updating ${type} configuration.\nPlease check file permissions.`,
                    path: `ea-config/${type}s.json`,
                    operation: "write",
                    requiredPermission: "write",
                  }),
                )
              }
              if (
                error.message.includes("parse") ||
                error.message.includes("JSON")
              ) {
                return Effect.fail(
                  new ConfigurationError({
                    message: `Invalid JSON in ${type} configuration.\nPlease fix any syntax errors.`,
                    configPath: `ea-config/${type}s.json`,
                    errorType: "parse",
                    cause: error,
                  }),
                )
              }
            }
            return Effect.fail(mapUnknownError(error))
          }),
        )
      }).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* handleCommandError(error, {
              command: `delete:${type}`,
              operation: "deletion",
            })
            return yield* Effect.fail(error)
          }),
        ),
      ),
    ),
  )
}

const configCommands = resourceTypes.map((type) =>
  makeDeleteConfigCommand(type),
)

export const deleteCommand = Command.make("delete", {}).pipe(
  Command.withDescription(
    "Remove resources from the project.\n\n" +
      "Available Resources:\n" +
      "  agent       Delete an agent package from the agents/ directory\n" +
      "  model       Remove a model from models.json\n" +
      "  provider    Remove a provider from providers.json\n" +
      "  rule        Remove a rule from policy.json\n" +
      "  toolkit     Remove a toolkit from tool-registry.json\n\n" +
      "⚠️ WARNING: These are destructive operations that cannot be undone.\n" +
      "A confirmation prompt will be shown before deletion.",
  ),
  Command.withSubcommands([deleteAgentCommand, ...configCommands]),
)
