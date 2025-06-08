import { Args, Command, Prompt } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Effect } from "effect"
import { FileSystemLayer, FileSystemOps } from "../services/fs.js"
import { ResourceType, deleteConfigItem } from "../utils/config-helpers.js"

const resourceTypes: ResourceType[] = ["model", "provider", "rule", "toolkit"]

const itemNameArg = Args.text({ name: "item-name" })

const deleteAgentCommand = Command.make("agent", { args: itemNameArg }).pipe(
    Command.withHandler(({ args: agentName }) =>
        Effect.gen(function* (_) {
            const path = yield* _(Path.Path)
            const fs = yield* _(FileSystem.FileSystem)
            const agentPath = path.join(process.cwd(), "agents", agentName)

            const exists = yield* _(FileSystemOps.exists(agentPath))
            if (!exists) {
                return yield* _(Effect.fail(`Agent "${agentName}" not found.`))
            }

            // It's good practice to confirm, similar to config items
            const confirmation = yield* _(
                Prompt.confirm({
                    message: `Are you sure you want to delete agent "${agentName}"? This will delete the entire directory.`,
                })
            )

            if (!confirmation) {
                yield* _(Effect.log("Deletion cancelled."))
                return
            }

            // Use fs.remove for recursive directory deletion
            yield* _(fs.remove(agentPath, { recursive: true }))
            yield* _(Effect.log(`Agent "${agentName}" deleted successfully.`))
        }).pipe(Effect.provide(FileSystemLayer))
    )
)

const deleteConfigCommands = resourceTypes.map((resourceType) =>
    Command.make(resourceType, { args: itemNameArg }).pipe(
        Command.withHandler(({ args: itemName }) =>
            deleteConfigItem(resourceType, itemName)
        )
    )
)

export const deleteCommand = Command.make("delete", {}).pipe(
    Command.withSubcommands([deleteAgentCommand, ...deleteConfigCommands])
)