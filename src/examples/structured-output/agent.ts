/**
 * @file Structured Output Agent implementation using AgentRuntime
 * @module examples/structured-output/agent
 */

import { Effect, Option, type Schema } from "effect";
import { type AgentRuntimeId, AgentRuntimeService, makeAgentRuntimeId } from "@/ea-agent-runtime/index.js";
import { type AgentActivity, AgentActivityType } from "@/ea-agent-runtime/types.js";
import { ObjectService } from "@/services/producers/object/service.js";
import { type GenerateStructuredOutputPayload, StructuredOutputPipelineError } from "./api.js";

export interface StructuredOutputAgentState {
    readonly generationCount: number
    readonly lastGeneration: Option.Option<any>
    readonly lastUpdate: Option.Option<number>
    readonly generationHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly prompt: string
        readonly result: any
    }>
}

interface GenerateCommand {
    readonly type: "GENERATE_STRUCTURED"
    readonly payload: GenerateStructuredOutputPayload<Schema.Schema<any, any>>
}

interface ExtractCommand {
    readonly type: "EXTRACT_STRUCTURED"
    readonly text: string
    readonly schema: Schema.Schema<any, any>
    readonly options?: { maxRetries?: number; modelId?: string }
}

interface StateUpdateCommand {
    readonly type: "UPDATE_STATE"
    readonly generation: any
    readonly prompt: string
}

type StructuredOutputActivityPayload = GenerateCommand | ExtractCommand | StateUpdateCommand

/**
 * Structured Output Agent implementation using AgentRuntime
 */
export interface StructuredOutputAgentConfig {
    readonly modelId?: string
}

export interface StructuredOutputAgentApi {
    readonly generateStructuredOutput: <A>(input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>, maxRetries?: number) => Effect.Effect<A, StructuredOutputPipelineError>
    readonly extractStructured: <A>(text: string, schema: Schema.Schema<A, A>, options?: { maxRetries?: number; modelId?: string }) => Effect.Effect<A, StructuredOutputPipelineError>
    readonly getAgentState: () => Effect.Effect<StructuredOutputAgentState, Error>
    readonly getRuntime: () => AgentRuntimeService
    readonly terminate: () => Effect.Effect<void, Error>;
    readonly getAgentRuntimeId: () => AgentRuntimeId;
    readonly modelId?: string
}

export class StructuredOutputAgent extends Effect.Service<StructuredOutputAgentApi>()(
    "StructuredOutputAgent",
    {
        effect: Effect.gen(function* () {
            const agentRuntimeService = yield* AgentRuntimeService;
            const objectService = yield* ObjectService;

            const agentId = makeAgentRuntimeId("structured-output-agent");

            const initialState: StructuredOutputAgentState = {
                generationCount: 0,
                lastGeneration: Option.none(),
                lastUpdate: Option.none(),
                generationHistory: []
            };

            // Create the agent runtime
            const runtime = yield* agentRuntimeService.create(agentId, initialState);

            yield* Effect.log("Structured Output agent initialized");

            const generateStructuredOutput = <A>(
                input: GenerateStructuredOutputPayload<Schema.Schema<A, A>>,
                maxRetries = 3
            ): Effect.Effect<A, StructuredOutputPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.log("generateStructuredOutput called", { prompt: input.prompt });

                    // Send command to agent
                    const activity: AgentActivity = {
                        id: `generate-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.COMMAND,
                        payload: { type: "GENERATE_STRUCTURED", payload: input } satisfies GenerateCommand,
                        metadata: { maxRetries },
                        sequence: 0
                    };

                    yield* runtime.send(activity);

                    // Generate using object service directly
                    const result = yield* objectService.generate({
                        prompt: input.prompt,
                        schema: input.schema,
                        modelId: input.modelId ?? "gpt-4o"
                    }).pipe(
                        Effect.mapError(error =>
                            error instanceof StructuredOutputPipelineError
                                ? error
                                : new StructuredOutputPipelineError({
                                    message: "Unexpected error in generateStructuredOutput",
                                    cause: error instanceof Error ? error : new Error(String(error)),
                                })
                        )
                    );

                    yield* Effect.log("Structured output generated", { data: JSON.stringify(result.data) });

                    // Update agent state
                    const stateUpdateActivity: AgentActivity = {
                        id: `update-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: {
                            generationCount: (yield* runtime.getState()).state.generationCount + 1,
                            lastGeneration: Option.some(result.data),
                            lastUpdate: Option.some(Date.now()),
                            generationHistory: [
                                ...(yield* runtime.getState()).state.generationHistory,
                                {
                                    timestamp: Date.now(),
                                    prompt: input.prompt,
                                    result: result.data
                                }
                            ].slice(-10) // Keep last 10 generations
                        },
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(stateUpdateActivity);

                    return result.data as A;
                }).pipe(
                    Effect.mapError((error: unknown) =>
                        error instanceof StructuredOutputPipelineError
                            ? error
                            : new StructuredOutputPipelineError({
                                message: "Unexpected error in generateStructuredOutput",
                                cause: error instanceof Error ? error : new Error(String(error))
                            })
                    )
                );

            const extractStructured = <A>(
                text: string,
                schema: Schema.Schema<A, A>,
                options?: { maxRetries?: number; modelId?: string }
            ): Effect.Effect<A, StructuredOutputPipelineError> =>
                Effect.gen(function* (this: StructuredOutputAgentApi) {
                    yield* Effect.log("extractStructured called", { text });

                    // Send command to agent
                    const activity: AgentActivity = {
                        id: `extract-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.COMMAND,
                        payload: { type: "EXTRACT_STRUCTURED", text, schema, options } satisfies ExtractCommand,
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(activity);

                    // Extract using object service directly
                    const result = yield* objectService.generate({
                        prompt: `Extract structured data from this text: ${text}`,
                        schema: schema,
                        modelId: options?.modelId ?? this.modelId ?? "gpt-4o"
                    }).pipe(
                        Effect.mapError(error =>
                            error instanceof StructuredOutputPipelineError
                                ? error
                                : new StructuredOutputPipelineError({
                                    message: "Unexpected error in extractStructured",
                                    cause: error instanceof Error ? error : new Error(String(error)),
                                })
                        )
                    );

                    yield* Effect.log("Structured data extracted", { data: JSON.stringify(result.data) });

                    // Update agent state
                    const stateUpdateActivity: AgentActivity = {
                        id: `update-extract-${Date.now()}`,
                        agentRuntimeId: agentId,
                        timestamp: Date.now(),
                        type: AgentActivityType.STATE_CHANGE,
                        payload: {
                            generationCount: (yield* runtime.getState()).state.generationCount + 1,
                            lastGeneration: Option.some(result.data),
                            lastUpdate: Option.some(Date.now()),
                            generationHistory: [
                                ...(yield* runtime.getState()).state.generationHistory,
                                {
                                    timestamp: Date.now(),
                                    prompt: `Extract from: ${text}`,
                                    result: result.data
                                }
                            ].slice(-10) // Keep last 10 generations
                        },
                        metadata: {},
                        sequence: 0
                    };

                    yield* runtime.send(stateUpdateActivity);

                    return result.data as A;
                }).pipe(
                    Effect.catchAll((error) =>
                        Effect.gen(function* () {
                            yield* Effect.logError("extractStructured failed", {
                                error: error instanceof Error ? error.stack ?? error.message : String(error)
                            });
                            return yield* Effect.fail(
                                error instanceof StructuredOutputPipelineError
                                    ? error
                                    : new StructuredOutputPipelineError({
                                        message: "Unexpected error in extractStructured",
                                        cause: error instanceof Error ? error : new Error(String(error)),
                                    })
                            );
                        })
                    )
                );

            const getAgentState = (): Effect.Effect<StructuredOutputAgentState, Error> =>
                Effect.gen(function* () {
                    const state = yield* runtime.getState();
                    return state.state;
                });

            const getRuntime = () => runtime;

            const terminate = (): Effect.Effect<void, Error> =>
                agentRuntimeService.terminate(agentId);

            const getAgentRuntimeId = () => agentId;

            return {
                generateStructuredOutput,
                extractStructured,
                getAgentState,
                getRuntime,
                terminate,
                getAgentRuntimeId
            };
        }),
        dependencies: [AgentRuntimeService.Default, ObjectService.Default]
    }
) { } 