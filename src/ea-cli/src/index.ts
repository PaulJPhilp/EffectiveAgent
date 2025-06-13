#!/usr/bin/env node

import { Command } from "@effect/cli"
import { NodeRuntime } from "@effect/platform-node"
import { Data, Effect } from "effect"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

// Import CLI commands
import { addCommand } from "./commands/add.js"
import { configCommands } from "./commands/config.js"
import { deleteCommand } from "./commands/delete.js"
import { initCommand } from "./commands/init.js"
import { listCommand } from "./commands/list.js"
import { logCommands } from "./commands/log.js"
import { runCommand } from "./commands/run.js"
import { ServeCommand } from "./commands/serve.js"
import { structureOutputCommand } from "./commands/structure-output.js"
import { testArgsCommand } from "./commands/test-args.js"

// Set up master configuration path and project root
const __dirname = fileURLToPath(new URL(".", import.meta.url))
const projectRoot = process.env.PROJECT_ROOT || join(__dirname, "../../..")
const configPath = process.env.MASTER_CONFIG_PATH || join(projectRoot, "config/master-config.json")

process.env.MASTER_CONFIG_PATH = configPath
process.env.PROJECT_ROOT = projectRoot

// Version information
const version = "1.0.0"

// Create root command
const program = Command.make("ea-cli", Data.struct({}))
  .pipe(
    Command.withSubcommands([
      runCommand,
      ServeCommand,
      addCommand,
      deleteCommand,
      initCommand,
      listCommand,
      configCommands,
      logCommands,
      structureOutputCommand,
      testArgsCommand
    ] as const)
  )

// Run CLI program
const args = process.argv

NodeRuntime.runMain(
  Command.run(program, { name: "ea-cli", version })(args).pipe(
    Effect.catchAll(error =>
      Effect.logError("CLI Error:", { error }).pipe(
        Effect.as(1)
      )
    )
  ),
  { disablePrettyLogger: false }
)
