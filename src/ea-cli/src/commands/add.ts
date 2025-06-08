import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { join } from "path";
import * as Templates from "../boilerplate/templates.js";
import { FileSystemLayer, FileSystemOps } from "../services/fs.js";
import { ResourceType, addConfigItem } from "../utils/config-helpers.js"; // Corrected import path

const agentArg = Args.text({ name: "agent-name" });

const addAgentCommand = Command.make("agent", { args: agentArg }).pipe(
    Command.withHandler(({ args: agentName }) =>
        Effect.gen(function* () {
            const agentPath = join(process.cwd(), "agents", agentName);
            const exists = yield* FileSystemOps.exists(agentPath);
            if (exists) {
                return yield* Effect.fail(`Agent directory ${agentName} already exists`);
            }

            // Create agent directory structure
            yield* FileSystemOps.createDir(join(agentPath, "__tests__"), { recursive: true });
            yield* FileSystemOps.createDir(join(agentPath, "agent"), { recursive: true });

            // Write agent files from templates
            yield* FileSystemOps.writeJson(
                join(agentPath, "package.json"),
                Templates.agentPackageJsonTemplate(agentName)
            );
            yield* FileSystemOps.writeFileString(
                join(agentPath, "vitest.config.ts"),
                Templates.vitestConfigTemplate
            );
            yield* FileSystemOps.writeFileString(
                join(agentPath, "agent", "index.ts"),
                Templates.agentIndexTemplate
            );
            yield* FileSystemOps.writeFileString(
                join(agentPath, "__tests__", "index.test.ts"),
                Templates.agentTestTemplate
            );
            // TODO: Add tsconfig.json for the agent, or ensure root tsconfig covers it.

            yield* Effect.log(
                `✅ Agent ${agentName} created successfully!\n\nNext steps:\n1. cd agents/${agentName}\n2. bun install (or npm/pnpm install)\n3. bun test (or npm/pnpm test)`
            );
        }).pipe(Effect.provide(FileSystemLayer))
    )
);

const resourceTypes: ResourceType[] = ["model", "provider", "rule", "toolkit"];
const itemNameArg = Args.text({ name: "item-name" }); // For add:model <name>, etc.

// Generic command for adding config-based resources
const addConfigResourceCommands = resourceTypes.map((resourceType) =>
    Command.make(resourceType, { args: itemNameArg }).pipe(
        Command.withHandler(({ args: itemName }) =>
            // For now, adds a very simple placeholder. This could be expanded later.
            addConfigItem(resourceType, itemName, { placeholder: true })
        )
    )
);

export const addCommand = Command.make("add", {}).pipe(
    Command.withSubcommands([addAgentCommand, ...addConfigResourceCommands])
);