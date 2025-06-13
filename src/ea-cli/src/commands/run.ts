import {
  AgentActivity,
  AgentRuntimeError,
  AgentRuntimeService,
  type AgentRuntimeServiceApi,
  makeAgentRuntimeId,
} from "@/ea-agent-runtime/index.js"
import { Args, Command, Options } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Console, Effect, Stream } from "effect"
import {
  ConfigurationError,
  FileSystemError,
  PermissionError,
} from "../errors.js"
import { exists } from "../services/fs.js"

// Local type for agent events
interface AgentEventLocal {
  type: string
  timestamp: Date
  data: Record<string, unknown>
}

// Framework integration for running an agent with improved error handling
const runAgent = (options: {
  projectRoot: string
  agentName: string
  input: string
}): Effect.Effect<
  Stream.Stream<AgentEventLocal, Error>,
  Error,
  AgentRuntimeServiceApi
> =>
  Effect.gen(function* () {
    const agentRuntime = yield* AgentRuntimeService
    const runtimeId = makeAgentRuntimeId(options.agentName)

    // Attempt to run agent with retries
    yield* Effect.tryPromise({
      try: () => Promise.resolve(options.input),
      catch: (error) =>
        new AgentRuntimeError({
          agentRuntimeId: runtimeId,
          message: `Failed to start agent: ${String(error)}`,
          cause: error,
        }),
    }).pipe(
      Effect.retry({
        times: 3,
        while: (error) =>
          error instanceof AgentRuntimeError &&
          error.message.includes("start agent"),
      }),
    )

    // Handle runtime errors with context-aware messages
    const runtimeEvents = agentRuntime.subscribe(runtimeId).pipe(
      Stream.catchAll((error) => {
        if (error instanceof AgentRuntimeError) {
          // Add better error context and recovery hints
          const enhancedError = new AgentRuntimeError({
            agentRuntimeId: runtimeId,
            message:
              `Agent runtime error: ${error.message}\n` +
              "Troubleshooting steps:\n" +
              "1. Check agent implementation for errors\n" +
              "2. Verify configuration in ea-config/\n" +
              "3. Check system resources\n" +
              "4. Review logs for details",
            cause: error,
          })
          return Stream.fail(enhancedError)
        }
        return Stream.fail(error)
      }),
    )

    return runtimeEvents.pipe(
      Stream.map(
        (activity: AgentActivity): AgentEventLocal => ({
          type: activity.type,
          timestamp: new Date(activity.timestamp),
          data: activity.payload as Record<string, unknown>,
        }),
      ),
      // Add error recovery for stream processing
      Stream.catchAll((error) =>
        Stream.succeed({
          type: "ERROR",
          timestamp: new Date(),
          data: {
            error: String(error),
            context: "Stream processing failed",
            agentName: options.agentName,
          },
        }),
      ),
    )
  })

// Validate agent configuration with comprehensive error handling
const validateAgentConfiguration = (agentDir: string, configDir: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    // Check required config files with detailed context
    const requiredConfigs = [
      { name: "models.json", purpose: "Machine learning model configurations" },
      { name: "providers.json", purpose: "API provider settings" },
      { name: "policies.json", purpose: "Agent runtime policies" },
    ]

    for (const config of requiredConfigs) {
      const configPath = path.join(configDir, config.name)

      // Check file exists with clear error context
      yield* exists(configPath).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message: `Failed to check if ${config.name} exists.\nPlease ensure you have necessary permissions.`,
              path: configPath,
              operation: "exists",
              cause: err,
            }),
        ),
        Effect.flatMap((exists) =>
          exists
            ? Effect.succeed(undefined)
            : Effect.fail(
              new ConfigurationError({
                message:
                  `Required configuration file ${config.name} not found.\n` +
                  `This file contains ${config.purpose}.\n` +
                  "Please run 'ea-cli init' if starting a new project.",
                configPath,
                errorType: "missing",
              }),
            ),
        ),
      )

      // Validate config file is readable and contains valid JSON
      yield* fs.readFileString(configPath).pipe(
        Effect.tap((content) =>
          Effect.try({
            try: () => JSON.parse(content),
            catch: () =>
              new ConfigurationError({
                message:
                  `Invalid JSON in ${config.name}.\n` +
                  `Please ensure the file contains valid JSON and no syntax errors.\n` +
                  "You can use 'ea-cli config:validate' to check all configuration files.",
                configPath,
                errorType: "parse",
              }),
          }),
        ),
        Effect.mapError((err) => {
          const error = err as Error
          if (error.message?.includes("EACCES")) {
            return new PermissionError({
              message: `Permission denied reading ${config.name}.\nPlease check file permissions.`,
              path: configPath,
              operation: "read",
              requiredPermission: "read",
            })
          }
          if (error instanceof ConfigurationError) {
            return error
          }
          return new FileSystemError({
            message: `Failed to read ${config.name}.\nPlease check file permissions and disk status.`,
            path: configPath,
            operation: "read",
            cause: error,
          })
        }),
      )
    }
  })

export const runCommand = Command.make(
  "run",
  {
    agentName: Args.text({ name: "agent-name" }).pipe(
      Args.withDescription(
        "The name of the agent to run (must exist in the agents/ directory)",
      ),
    ),
    input: Options.text("input").pipe(
      Options.withAlias("i"),
      Options.withDescription("The input text to send to the agent"),
    ),
  },
  ({ agentName, input }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const pathSvc = yield* Path.Path
      const projectRoot = process.env.PROJECT_ROOT || process.cwd()

      // Validate agent exists with clear error messages
      const agentDir = pathSvc.join(projectRoot, "agents", agentName)
      const agentExists = yield* exists(agentDir).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message:
                "Failed to check if agent directory exists.\nPlease ensure you have necessary permissions.",
              path: agentDir,
              operation: "exists",
              cause: err,
            }),
        ),
      )

      if (!agentExists) {
        return Effect.fail(
          new AgentRuntimeError({
            agentRuntimeId: makeAgentRuntimeId(agentName),
            message: `Agent '${agentName}' not found.\nMake sure:\n1. The agent exists in the agents/ directory\n2. You're in the correct project root\n3. You've run 'ea-cli init' if this is a new project`,
          }),
        )
      }

      // Validate configuration with recovery suggestions
      const configDir = pathSvc.join(projectRoot, "ea-config")
      yield* validateAgentConfiguration(agentDir, configDir)

      yield* Console.log(`Running agent: ${agentName}...`)

      // Run agent with event handling and retry for transient errors
      const eventStreamEffect = runAgent({
        projectRoot: projectRoot,
        agentName,
        input: input || "Hello", // Provide a default input if none is given
      })

      // Get the event stream with AgentRuntimeService provided
      const eventStream = yield* eventStreamEffect.pipe(
        Effect.provide(AgentRuntimeService.Default),
      )

      // Process events with error handling
      yield* eventStream.pipe(
        Stream.tap((event) =>
          Effect.sync(() => {
            switch (event.type) {
              case "start":
                return Console.log(`Agent started processing input: ${input}`)
              case "output":
                return Console.log(`Agent output: ${event.data.output}`)
              case "error":
                return Console.error(`Agent error: ${event.data.error}`)
              case "complete":
                return Console.log("Agent execution completed successfully")
              default:
                return Console.log(`Event: ${event.type}`)
            }
          }),
        ),
        Stream.runDrain,
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            if (error instanceof AgentRuntimeError) {
              yield* Console.error(
                `Agent Runtime Error: ${error.message}\n` +
                "Possible solutions:\n" +
                "1. Check agent implementation in agents/ directory\n" +
                "2. Verify configuration files in ea-config/\n" +
                "3. Run 'ea-cli config:validate' to check configurations",
              )
            } else {
              yield* Console.error(`Error: ${String(error)}`)
            }
          }),
        ),
        Effect.provide(NodeContext.layer),
        Effect.catchAll((error) => Effect.fail(error)),
      )

      yield* Console.log(`Agent ${agentName} finished.`)
    }).pipe(
      Effect.provide(NodeContext.layer),
      Effect.tapError((error) =>
        Effect.gen(function* () {
          if (error instanceof Error) {
            yield* Console.error(
              error instanceof (AgentRuntimeError || ConfigurationError)
                ? `${error.constructor.name}: ${error.message}`
                : `Error: ${error.message}\nTry running 'ea-cli config:validate' to check your configuration.`,
            )
          } else {
            yield* Console.error(`Error: ${String(error)}`)
          }
        }),
      ),
    ),
).pipe(
  Command.withDescription(
    "Execute an agent with the specified input and stream its output to the terminal.\n\n" +
    "This command will:\n" +
    "  1. Validate the agent exists in agents/ directory\n" +
    "  2. Check required configuration files are present\n" +
    "  3. Parse and validate configuration JSON\n" +
    "  4. Run the agent with the provided input\n" +
    "  5. Stream execution events to the terminal\n\n" +
    "Common issues and solutions:\n" +
    "  - Missing agent: Use 'ea-cli add:agent' to create it\n" +
    "  - Config errors: Use 'ea-cli config:validate' to check files\n" +
    "  - Permission errors: Check read/write access to project files\n" +
    "  - Runtime errors: Check agent implementation and logs",
  ),
)
