import { Args, Command, Options } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Console, Duration, Effect, Stream } from "effect";

type ServerEventType = 'SERVER_START' | 'REQUEST' | 'RESPONSE' | 'ERROR' | 'INFO' | 'HEARTBEAT';

interface ServerEvent {
    type: ServerEventType;
    timestamp: Date;
    data: any;
}

let lastRequestId = 0;
const nextRequestId = () => (++lastRequestId).toString();

const mockEndpoints = [
    { method: 'POST', path: '/chat', description: 'Chat endpoint' },
    { method: 'POST', path: '/generate', description: 'Text generation endpoint' },
    { method: 'POST', path: '/analyze', description: 'Analysis endpoint' },
];

const mockStatusCodes = [200, 200, 200, 200, 201, 400, 500]; // Weighted towards success

// Mocked framework function for serving an agent
const mockServeAgent = (agentName: string, port: number, host: string): Stream.Stream<ServerEvent, Error, never> => {
    // Stream for startup events
    const startupEvents = Stream.fromIterable([
        {
            type: 'SERVER_START' as const,
            timestamp: new Date(),
            data: { agentName, host, port, message: 'Starting server...' }
        },
        {
            type: 'INFO' as const,
            timestamp: new Date(),
            data: { message: 'Loading agent configuration...' }
        },
        {
            type: 'INFO' as const,
            timestamp: new Date(),
            data: { message: 'Agent loaded successfully' }
        },
        {
            type: 'INFO' as const,
            timestamp: new Date(),
            data: { message: 'Server ready' }
        }
    ]);

    // Stream for periodic heartbeat events (every 5 seconds)
    const heartbeatEvents = Stream.repeatEffect(
        Effect.succeed({
            type: 'HEARTBEAT' as const,
            timestamp: new Date(),
            data: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                activeRequests: Math.floor(Math.random() * 5)
            }
        }).pipe(Effect.delay(Duration.seconds(5)))
    );

    // Stream for simulated request/response events (random intervals)
    const requestEvents = Stream.repeatEffect(
        Effect.gen(function* (_) {
            const reqId = nextRequestId();
            const endpoint = mockEndpoints[Math.floor(Math.random() * mockEndpoints.length)];
            const status = mockStatusCodes[Math.floor(Math.random() * mockStatusCodes.length)];

            // Random delay between 1-3 seconds for the next request
            const delay = Math.floor(Math.random() * 2000) + 1000;

            yield* _(Effect.sleep(Duration.millis(delay)));

            // Emit request event
            const requestEvent: ServerEvent = {
                type: 'REQUEST',
                timestamp: new Date(),
                data: {
                    id: reqId,
                    method: endpoint.method,
                    path: endpoint.path,
                    description: endpoint.description
                }
            };

            // Emit response event after a short delay
            const responseEvent: ServerEvent = {
                type: 'RESPONSE',
                timestamp: new Date(),
                data: {
                    requestId: reqId,
                    status,
                    message: status === 200 ? 'Success' : status === 400 ? 'Bad Request' : 'Internal Error'
                }
            };

            return [requestEvent, responseEvent];
        }).pipe(
            Effect.delay(Duration.seconds(2))
        )
    ).pipe(Stream.flatMap(Stream.fromIterable));

    // Merge all event streams
    return Stream.merge(startupEvents, Stream.merge(heartbeatEvents, requestEvents));
};

// Helper to format events for console output
const formatEvent = (event: ServerEvent): string => {
    const timestamp = event.timestamp.toISOString();
    switch (event.type) {
        case 'SERVER_START':
            return `[${timestamp}] 🚀 Server starting on ${event.data.host}:${event.data.port}`;
        case 'REQUEST':
            return `[${timestamp}] ← ${event.data.method} ${event.data.path} (${event.data.id})`;
        case 'RESPONSE': {
            const statusEmoji = event.data.status < 300 ? '✅' : event.data.status < 500 ? '⚠️' : '❌';
            return `[${timestamp}] → [${event.data.status}] ${statusEmoji} (${event.data.requestId})`;
        }
        case 'ERROR':
            return `[${timestamp}] ❌ ERROR: ${event.data.message}`;
        case 'HEARTBEAT':
            return `[${timestamp}] 💓 Active requests: ${event.data.activeRequests}`;
        case 'INFO':
        default:
            return `[${timestamp}] ℹ️  ${event.data.message}`;
    }
};

export const serveCommand = Command.make(
    "serve",
    {
        agentName: Args.text({ name: "agent-name" }),
        port: Options.integer("port").pipe(Options.withDefault(3000)),
        host: Options.text("host").pipe(Options.withDefault("127.0.0.1")),
    },
    ({ agentName, port, host }) =>
        Effect.gen(function* (_) {
            const fs = yield* _(FileSystem.FileSystem);
            const pathSvc = yield* _(Path.Path);
            const cwd = process.cwd();

            // 1. Validate agent exists
            const agentDir = pathSvc.join(cwd, "agents", agentName);
            const agentExists = yield* _(fs.exists(agentDir));
            if (!agentExists) {
                yield* _(Console.error(`Agent directory not found: ${agentDir}`));
                return yield* _(Effect.fail(new Error(`Agent '${agentName}' not found.`)));
            }

            // 2. Validate config exists (simplified check)
            const modelConfigPath = pathSvc.join(cwd, "ea-config", "models.json");
            const configExists = yield* _(fs.exists(modelConfigPath));
            if (!configExists) {
                yield* _(Console.error(`Models configuration not found: ${modelConfigPath}`));
                return yield* _(Effect.fail(new Error("Project models.json not found.")));
            }

            yield* _(Console.log(`Starting agent server for ${agentName}...`));

            const serverEventStream = mockServeAgent(agentName, port, host);

            // Process the event stream
            yield* _(
                Stream.runForEach(
                    serverEventStream,
                    (event) => Console.log(formatEvent(event))
                )
            );
        }).pipe(Effect.provide(NodeContext.layer))
);