#!/usr/bin/env node

import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Command } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect } from "effect"

// Import the production runtime for proper initialization
import { runWithAgentRuntime } from "@/ea-agent-runtime/production-runtime.js"

// Import CLI commands
import { addCommand } from "./commands/add.js"
import { configCommands } from "./commands/config.js"
import { deleteCommand } from "./commands/delete.js"
import { initCommand } from "./commands/init.js"
import { listCommand } from "./commands/list.js"
import { logCommands } from "./commands/log.js"
import { runCommand } from "./commands/run.js"
import { ServeCommand } from "./commands/serve.js"
import { testCommand } from "./commands/test.js"

// DEBUG: Print process.argv at the top of the CLI entrypoint
console.error("DEBUG process.argv:", process.argv)

// Set up master configuration path and project root
const __dirname = fileURLToPath(new URL(".", import.meta.url))
const projectRoot = join(__dirname, "../../..")
const configPath = join(projectRoot, "config-master/test.json")

process.env.MASTER_CONFIG_PATH = configPath
process.env.PROJECT_ROOT = projectRoot

// Version information
const version = "1.0.0"
const cli = Command.make("ea-cli", {}, () =>
  Effect.succeed(undefined),
).pipe(
  Command.withDescription(
    "Official command-line interface for the Effective Agents framework.\n\n" +
    "Core functionality:\n" +
    "  • Project initialization and scaffolding\n" +
    "  • Resource management (agents, models, providers, etc.)\n" +
    "  • Agent execution (run, serve)\n" +
    "  • Configuration validation\n" +
    "  • Log management\n\n" +
    "Use 'ea-cli --help' to see available commands and their descriptions.\n" +
    "Use 'ea-cli <command> --help' for detailed help on specific commands.",
  ),
  Command.withSubcommands([
    initCommand,
    addCommand,
    configCommands,
    deleteCommand,
    listCommand,
    logCommands,
    runCommand,
    ServeCommand,
    testCommand,
  ]),
)

// Ensure the CLI runs when executed directly with proper error handling
if (import.meta.url === `file://${process.argv[1]}`) {
  // Create CLI effect with standard @effect/cli pattern  
  const cliProgram = Command.run(cli, {
    name: "ea-cli",
    version,
  })

  const cliEffect = Effect.suspend(() => cliProgram(process.argv))
  
  // Run with agent runtime to provide all necessary services
  runWithAgentRuntime(cliEffect)
    .then(() => {
      // CLI execution completed successfully
    })
    .catch((error) => {
      console.error("CLI execution failed:", error)
      process.exit(1)
    })
}
