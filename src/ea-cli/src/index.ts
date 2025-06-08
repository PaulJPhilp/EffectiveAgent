#!/usr/bin/env node

import { Command } from "@effect/cli"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
import { join } from "path"
import { fileURLToPath } from "url"
import { addCommand } from "./commands/add.js"
import { configCommand } from "./commands/config.js"
import { deleteCommand } from "./commands/delete.js"
import { initCommand } from "./commands/init.js"
import { listCommand } from "./commands/list.js"
import { logCommand } from "./commands/log.js"
import { runCommand } from "./commands/run.js"
import { serveCommand } from "./commands/serve.js"

// DEBUG: Print process.argv at the top of the CLI entrypoint
console.error('DEBUG process.argv:', process.argv)

// Set up master configuration path
const __dirname = fileURLToPath(new URL(".", import.meta.url))
process.env.MASTER_CONFIG_PATH = join(__dirname, "../../config-master/test.json")

// Version information
const version = "1.0.0"

// Main program
const program = Effect.gen(function* () {
    // Create the main command
    const mainCommand = Command.make("ea-cli", {}, () => Effect.succeed(undefined))
        .pipe(Command.withSubcommands([
            initCommand,
            addCommand,
            configCommand,
            deleteCommand,
            listCommand,
            logCommand,
            runCommand,
            serveCommand
        ]))

    // Run the command
    return yield* Command.run(mainCommand, {
        name: "ea-cli",
        version
    })(process.argv)
})

// Ensure the CLI runs when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    Effect.runPromise(program.pipe(Effect.provide(NodeContext.layer)))
}


