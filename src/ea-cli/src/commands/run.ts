import { Args, Command } from "@effect/cli";
import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Console, Duration, Effect, Option, Stream } from "effect"; // Added Option

interface AgentEvent {
    type: string;
    timestamp: Date;
    data: any;
}

// Mocked framework function for runAgent
const runAgent = (agentName: string): Stream.Stream<AgentEvent, Error, never> => {
    const events: AgentEvent[] = [
        { type: "AGENT_START", timestamp: new Date(), data: { agentName, message: "Agent process initiated." } },
        { type: "TASK_START", timestamp: new Date(), data: { taskName: "Initializing resources" } },
        { type: "INFO", timestamp: new Date(), data: { message: "Resources initialized successfully." } },
        { type: "TASK_COMPLETE", timestamp: new Date(), data: { taskName: "Initializing resources", status: "Success" } },
        { type: "TASK_START", timestamp: new Date(), data: { taskName: "Processing input data" } },
        { type: "INFO", timestamp: new Date(), data: { message: `Simulating work for agent ${agentName}...` } },
        { type: "TASK_OUTPUT", timestamp: new Date(), data: { output: "Generated response chunk 1" } },
        { type: "TASK_OUTPUT", timestamp: new Date(), data: { output: "Generated response chunk 2" } },
        { type: "TASK_COMPLETE", timestamp: new Date(), data: { taskName: "Processing input data", status: "Success", result: "Agent finished processing." } },
        { type: "AGENT_END", timestamp: new Date(), data: { agentName, message: "Agent process completed." } },
    ];

    return Stream.unfoldEffect(0, (index) =>
        Effect.gen(function* (_) {
            if (index >= events.length) {
                return Option.none(); // End of stream
            }
            const event = events[index];
            event.timestamp = new Date(); // Update timestamp just before emitting
            yield* _(Effect.sleep(Duration.millis(500))); // Delay between events
            return Option.some([event, index + 1] as const);
        })
    );
};

export const runCommand = Command.make(
    "run",
    {
        agentName: Args.text({ name: "agent-name" }),
    },
    ({ agentName }) =>
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
            yield* _(Console.log(`Found agent: ${agentName} at ${agentDir}`))

            // 2. Validate config exists (simplified check)
            const modelConfigPath = pathSvc.join(cwd, "ea-config", "models.json");
            const configExists = yield* _(fs.exists(modelConfigPath));
            if (!configExists) {
                yield* _(Console.error(`Models configuration not found: ${modelConfigPath}`));
                return yield* _(Effect.fail(new Error("Project models.json not found.")));
            }
            yield* _(Console.log(`Found models configuration: ${modelConfigPath}`))

            yield* _(Console.log(`Running agent: ${agentName}...`));

            const eventStream = runAgent(agentName);

            yield* _(
                Stream.runForEach(eventStream, (event) =>
                    Console.log(
                        `[${event.timestamp.toLocaleTimeString()}] [${event.type}] ${JSON.stringify(event.data)}`
                    )
                )
            );

            yield* _(Console.log(`Agent ${agentName} finished.`));
        }).pipe(Effect.provide(NodeContext.layer))
);