import { ActorServer } from "@/ea-actor-runtime/server.js"
import { AgentRuntimeService } from "@/ea-agent-runtime/service.js"
import { Args, Command, Options } from "@effect/cli"
import { Path } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Console, Duration, Effect, Layer, Schedule, Stream } from "effect"
import {
  AgentRuntimeError,
  ConfigurationError,
  FileSystemError,
  NetworkError,
  mapUnknownError,
} from "../errors.js"
import { exists } from "../services/fs.js"
import {
  type ClientConnectEvent,
  type ClientDisconnectEvent,
  type RequestEvent,
  type ResponseEvent,
  type ServerEventUnion,
  type ServerReadyEvent,
  type ServerStartEvent,
  type ServerStopEvent
} from "../types/server.js"

const formatEvent = (event: ServerEventUnion): string => {
  const timestamp = event.timestamp.toISOString()
  switch (event.type) {
    case "SERVER_START": {
      const data = event.data as ServerStartEvent["data"]
      return `[${timestamp}] 🚀 Server starting on ${data.host}:${data.port}`
    }
    case "SERVER_READY": {
      const data = event.data as ServerReadyEvent["data"]
      return `[${timestamp}] ✅ Server ready at ws://${data.host}:${data.port}`
    }
    case "SERVER_STOP": {
      const data = event.data as ServerStopEvent["data"]
      return `[${timestamp}] 🛑 Server stopping: ${data.reason}`
    }
    case "CLIENT_CONNECT": {
      const data = event.data as ClientConnectEvent["data"]
      return `[${timestamp}] 🔌 Client connected [${data.clientId}]`
    }
    case "CLIENT_DISCONNECT": {
      const data = event.data as ClientDisconnectEvent["data"]
      return `[${timestamp}] ❌ Client disconnected [${data.clientId}]: ${data.reason || "Unknown reason"
        }`
    }
    case "REQUEST": {
      const data = event.data as RequestEvent["data"]
      return `[${timestamp}] 📥 [${data.clientId}] ${data.message}`
    }
    case "RESPONSE": {
      const data = event.data as ResponseEvent["data"]
      return `[${timestamp}] 📤 [${data.clientId}] ${data.message}`
    }
    case "ERROR": {
      return `[${timestamp}] ❌ ERROR: ${event.data.message}`
    }
    case "HEARTBEAT": {
      const { activeConnections, memory, uptime } = event.data
      const memoryMb = Math.round(memory.heapUsed / 1024 / 1024)
      const uptimeHours = Math.round((uptime / 3600) * 10) / 10
      return `[${timestamp}] 💓 Connections: ${activeConnections}, Memory: ${memoryMb}MB, Uptime: ${uptimeHours}h`
    }
    case "INFO":
    default: {
      return `[${timestamp}] ℹ️  ${event.data.message}`
    }
  }
}

// WebSocket-based agent server implementation with proper Effect error handling
const serveAgent = (
  agentName: string,
  port: number,
  host: string,
): Stream.Stream<ServerEventUnion, never, unknown> => {
  // Validate server configuration with Effect
  const validateServerConfig = Effect.gen(function* () {
    const server = yield* ActorServer

    const addr = yield* Effect.try({
      try: () => server.wss.address(),
      catch: (error) =>
        new NetworkError({
          message: `Failed to get server address: ${mapUnknownError(error).message}`,
          operation: "server-validation",
          host,
          port,
          cause: error,
        }),
    })

    return yield* addr && typeof addr !== "string"
      ? Effect.fail(
        new NetworkError({
          message: `Port ${port} is already in use. Choose a different port or stop any existing server.`,
          operation: "server-validation",
          host,
          port,
        }),
      )
      : Effect.succeed(undefined)
  })

  // Create startup event stream with proper error handling
  const startupEvents = Stream.fromEffect(
    Effect.gen(function* () {
      const server = yield* ActorServer
      const startEvent: ServerEventUnion = {
        type: "SERVER_START",
        timestamp: new Date(),
        data: { agentName, host, port, message: "Starting server" },
      }

      // The WebSocket server starts listening when first created
      const readyEvent: ServerEventUnion = {
        type: "SERVER_READY",
        timestamp: new Date(),
        data: { agentName, host, port, message: "Server ready" },
      }

      return [startEvent, readyEvent]
    }),
  ).pipe(Stream.flatMap(Stream.fromIterable))

  // Process client connections with Effect-based error handling
  const connectionEvents = Effect.gen(function* () {
    const server = yield* ActorServer
    return Stream.fromEffect(
      Effect.async<ServerEventUnion>((resume) => {
        server.wss.on("connection", (ws) => {
          const clientId = Math.random().toString(36).slice(2)

          // Handle connect
          resume(
            Effect.succeed({
              type: "CLIENT_CONNECT",
              timestamp: new Date(),
              data: { clientId, agentName, host, port, message: "Client connected" },
            } as ServerEventUnion),
          )

          // Handle messages with Effect
          ws.on("message", (data) => {
            const message = data.toString()
            resume(
              Effect.succeed({
                type: "REQUEST",
                timestamp: new Date(),
                data: { clientId, agentName, host, port, message },
              } as ServerEventUnion),
            )

            // Process request with Effect
            Effect.gen(function* () {
              return yield* Effect.succeed({
                type: "RESPONSE",
                timestamp: new Date(),
                data: { clientId, agentName, host, port, message: "Message received" },
              } as ServerEventUnion)
            }).pipe(Effect.map((event) => resume(Effect.succeed(event))))
          })

          // Handle disconnect with proper cleanup
          ws.on("close", (code, reason) => {
            resume(
              Effect.succeed({
                type: "CLIENT_DISCONNECT",
                timestamp: new Date(),
                data: {
                  clientId,
                  agentName,
                  host,
                  port,
                  message: reason.toString() || "Client disconnected",
                  code,
                },
              } as ServerEventUnion),
            )
          })

          // Handle WebSocket errors
          ws.on("error", (error) => {
            resume(
              Effect.succeed({
                type: "ERROR",
                timestamp: new Date(),
                data: {
                  clientId,
                  agentName,
                  host,
                  port,
                  message: `WebSocket error: ${error.message}`,
                  code: error instanceof Error && error.name !== "Error" ? 1002 : 1011,
                  cause: error,
                },
              } as ServerEventUnion),
            )
          })
        })

        return Effect.succeed(void 0)
      }),
    )
  })

  // Handle heartbeats with Effect
  const heartbeatEvents = Stream.repeatEffect(
    Effect.gen(function* () {
      const server = yield* ActorServer

      const event: ServerEventUnion = {
        type: "HEARTBEAT",
        timestamp: new Date(),
        data: {
          agentName,
          host,
          port,
          message: "Server heartbeat",
          activeConnections: server.wss.clients.size,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      }

      return event
    })
  ).pipe(
    Stream.schedule(Schedule.fixed(Duration.seconds(30)))
  )

  // Handle graceful process termination
  const cleanupEvents = Stream.fromEffect(
    Effect.async<ServerEventUnion>((resume) => {
      const cleanup = () => {
        resume(
          Effect.succeed({
            type: "SERVER_STOP",
            timestamp: new Date(),
            data: {
              agentName,
              host,
              port,
              message: "Server stopping due to process termination",
            },
          } as ServerEventUnion),
        )
        process.exit(0)
      }

      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)

      return Effect.succeed(void 0)
    }),
  )

  // Merge all event streams with proper error handling
  return Stream.mergeAll(
    [
      startupEvents,
      Stream.fromEffect(connectionEvents).pipe(
        Stream.flatten,
      ) as Stream.Stream<ServerEventUnion, never, unknown>,
      heartbeatEvents,
      cleanupEvents,
    ],
    { concurrency: "unbounded" },
  ).pipe(
    Stream.catchAll((error) =>
      Stream.succeed({
        type: "ERROR",
        timestamp: new Date(),
        data: {
          agentName,
          host,
          port,
          message: `Stream error: ${String(error)}`,
          cause: error,
        },
      } as ServerEventUnion),
    ),
  )
}

const validateAgentConfiguration = (agentDir: string, configDir: string) =>
  Effect.gen(function* () {
    const pathSvc = yield* Path.Path

    // Check required config files with improved error messages
    const requiredConfigs = [
      { name: "models.json", desc: "model configurations" },
      { name: "providers.json", desc: "provider settings" },
      { name: "policy.json", desc: "policy rules" },
    ]

    yield* Effect.forEach(
      requiredConfigs,
      (config) => {
        const configPath = pathSvc.join(configDir, config.name)
        return exists(configPath).pipe(
          Effect.mapError(
            (err) =>
              new FileSystemError({
                message: `Failed to check if ${config.name} exists. Please ensure ea-config directory is accessible.`,
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
                  message: `Required configuration file ${config.name} not found.\nThis file contains ${config.desc} and must exist in ea-config/.`,
                  configPath,
                  errorType: "missing",
                }),
              ),
          ),
        )
      },
      { concurrency: 1 },
    )

    // Check agent package with detailed validation
    const packagePath = pathSvc.join(agentDir, "package.json")
    yield* exists(packagePath).pipe(
      Effect.mapError(
        (err) =>
          new FileSystemError({
            message:
              "Failed to check agent's package.json. Please ensure the agent directory is accessible.",
            path: packagePath,
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
                "Agent package.json not found. Please ensure:\n" +
                "1. The agent was created using 'ea-cli add:agent'\n" +
                "2. The agent directory structure is intact\n" +
                "3. You are in the correct workspace directory",
              configPath: packagePath,
              errorType: "missing",
            }),
          ),
      ),
    )
  })

// Create application layer with explicit dependency chain:
// NodeContext -> AgentRuntime -> ActorServer
const AppLayer = Layer.merge(
  NodeContext.layer,
  Layer.provide(ActorServer.Default, AgentRuntimeService.Default),
)

export const ServeCommand = Command.make(
  "serve",
  {
    agentName: Args.text({ name: "agent-name" }).pipe(
      Args.withDescription(
        "The name of the agent to serve (must exist in the agents/ directory)",
      ),
    ),
    port: Options.integer("port").pipe(
      Options.withDefault(8081),
      Options.withDescription("The port number to listen on (default: 8081)"),
    ),
    host: Options.text("host").pipe(
      Options.withDefault("127.0.0.1"),
      Options.withDescription(
        "The host address to bind to (default: 127.0.0.1)",
      ),
    ),
  },
  ({ agentName, port, host }) =>
    Effect.gen(function* () {
      const pathSvc = yield* Path.Path
      const projectRoot = process.env.PROJECT_ROOT || process.cwd()

      // 1. Validate agent exists
      const agentDir = pathSvc.join(projectRoot, "agents", agentName)
      yield* exists(agentDir).pipe(
        Effect.mapError(
          (err) =>
            new FileSystemError({
              message: "Failed to check if agent directory exists",
              path: agentDir,
              operation: "exists",
              cause: err,
            }),
        ),
        Effect.flatMap((exists) =>
          exists
            ? Effect.succeed(undefined)
            : Effect.fail(
              new AgentRuntimeError({
                message: `Agent '${agentName}' not found. Make sure the agent exists in the agents/ directory.`,
                agentName,
                phase: "validation",
              }),
            ),
        ),
      )

      // 2. Validate configuration
      const configDir = pathSvc.join(projectRoot, "ea-config")
      yield* validateAgentConfiguration(agentDir, configDir)

      yield* Console.log(`Starting agent server for ${agentName}...`)

      // 3. Start server with error handling
      const serverEventStream = serveAgent(agentName, port, host)

      // Process the event stream with error handling
      yield* Stream.runForEach(serverEventStream, (event: ServerEventUnion) =>
        Effect.gen(function* () {
          yield* Console.log(formatEvent(event))

          if (event.type === "ERROR") {
            return Effect.fail(
              new AgentRuntimeError({
                message: event.data.message,
                agentName,
                phase: "server",
              }),
            )
          }
          return Effect.succeed(undefined)
        }).pipe(
          Effect.tapError((error: Error | unknown) =>
            Effect.gen(function* () {
              if (error instanceof NetworkError) {
                yield* Console.error(`Network error: ${error.message}`)
              } else if (error instanceof AgentRuntimeError) {
                yield* Console.error(`Agent runtime error: ${error.message}`)
              } else if (error instanceof ConfigurationError) {
                yield* Console.error(`Configuration error: ${error.message}`)
              } else {
                yield* Console.error(`Error: ${String(error)}`)
              }
            }),
          ),
        ),
      )
    }).pipe(
      Effect.provide(
        Layer.merge(
          NodeContext.layer,
          Layer.provide(ActorServer.Default, AgentRuntimeService.Default),
        ),
      ),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Console.error(
            `Server error: ${error instanceof Error ? error.message : String(error)
            }`,
          )
          return Effect.fail(error)
        }),
      ),
    ),
).pipe(
  Command.withDescription(
    "Start an agent server that accepts WebSocket connections.\n\n" +
    "This command will:\n" +
    "  1. Start a WebSocket server for the specified agent\n" +
    "  2. Listen for client connections and process requests\n" +
    "  3. Display real-time server status and connection info\n\n" +
    "Arguments:\n" +
    "  agent-name    The name of the agent to serve\n\n" +
    "Options:\n" +
    "  --port       Port number to listen on (default: 8081)\n" +
    "  --host       Host address to bind to (default: 127.0.0.1)\n\n" +
    "Example: ea-cli serve my-agent --port 8082 --host 0.0.0.0\n\n" +
    "The server will continue running until interrupted. Status updates, client\n" +
    "connections, and errors will be logged to the console.",
  ),
)
