import { Command } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { Effect } from "effect";
import { FileSystemLayer, FileSystemOps } from "../services/fs.js";
import { ResourceType, listConfigItems } from "../utils/config-helpers.js";

const resourceTypes: ResourceType[] = ["model", "provider", "rule", "toolkit"];

const listAgentCommand = Command.make("agent").pipe(
    Command.withHandler(() =>
        Effect.gen(function* (_) {
            const path = yield* _(Path.Path);
            const fs = yield* _(FileSystem.FileSystem);
            const agentsDir = path.join(process.cwd(), "agents");
            const exists = yield* _(FileSystemOps.exists(agentsDir));
            if (!exists) {
                return yield* _(Effect.fail("Agents directory not found. Run `ea-cli init` first."));
            }
            const entries = yield* _(fs.readDirectory(agentsDir));
            if (entries.length === 0) {
                yield* _(Effect.log("No agents found."));
                return;
            }
            yield* _(Effect.log("Available agents:"));
            for (const entry of entries) {
                const entryPath = path.join(agentsDir, entry);
                // Check if it's a directory by trying to read it as a directory
                // This is a workaround as fs.isDirectory is not directly available
                const isDirectory = yield* _(Effect.isSuccess(fs.readDirectory(entryPath)));
                if (isDirectory) {
                    yield* _(Effect.log(`- ${entry}`));
                }
            }
        }).pipe(Effect.provide(FileSystemLayer))
    )
);

const listCommands = resourceTypes.map((resourceType) =>
    Command.make(resourceType).pipe(
        Command.withHandler(() => listConfigItems(resourceType))
    )
);

export const listCommand = Command.make("list", {}).pipe(
    Command.withSubcommands([listAgentCommand, ...listCommands])
);