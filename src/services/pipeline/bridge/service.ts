import {
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js";
import { AgentActivity, AgentRecordType, AgentRuntimeId } from "@/agent-runtime/types.js";
import { SequenceGenerator } from "@/services/core/sequence/sequence-generator.js";
import { Effect, Stream } from "effect";
import uuid4 from "uuid4";
import type { BridgeServiceApi } from "./api.js";
import {
    BridgeMessageSendError,
    BridgeRuntimeCreationError,
    BridgeRuntimeNotFoundError,
    BridgeStateError,
    BridgeSubscriptionError,
    BridgeTerminationError
} from "./errors.js";
import { BridgeMessage, BridgeState, DEFAULT_RETENTION_CONFIG } from "./types.js";

/**
 * Cleanup threshold in milliseconds
 * Cleanup will be performed if this much time has passed since last cleanup
 */
const CLEANUP_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Type guard to validate AgentRuntimeId.
 * @param id - The AgentRuntimeId to validate.
 * @returns True if valid, false otherwise.
 */
function isValidAgentRuntimeId(id: AgentRuntimeId | undefined | null): boolean {
    return typeof id === "string" && id.length > 0
}

/**
 * An empty array for BridgeState initialization
 */
const EMPTY_MESSAGES: BridgeMessage[] = []

/**
 * The AgentRecordType for event messages
 */
const EVENT_TYPE: typeof AgentRecordType.EVENT = AgentRecordType.EVENT

/**
 * Performs cleanup of old messages based on retention policy
 */
function cleanupMessages(state: BridgeState): BridgeState {
    const now = Date.now()
    const { maxMessages, maxAgeMs } = state.retention
    const minTimestamp = now - maxAgeMs

    // Filter messages based on age and sort by sequence
    const messages = state.messages
        .filter(msg => msg.timestamp >= minTimestamp)
        .sort((a, b) => b.sequence - a.sequence)
        .slice(0, maxMessages)

    return {
        ...state,
        messages,
        lastCleanup: now
    }
}

/**
 * Checks if cleanup should be performed
 */
function shouldCleanup(state: BridgeState): boolean {
    return Date.now() - state.lastCleanup > CLEANUP_THRESHOLD_MS
}

/**
 * BridgeService class
 */
export class BridgeService extends Effect.Service<BridgeServiceApi>()("BridgeService", {
    effect: Effect.gen(function* () {
        // Get dependencies
        const agentRuntimeService = yield* AgentRuntimeService
        const sequenceGenerator = yield* SequenceGenerator

        // Helper to get state with cleanup if needed
        const getStateWithCleanup = <S extends BridgeState>(id: AgentRuntimeId) =>
            Effect.gen(function* () {
                const state = yield* agentRuntimeService.getState<S>(id)
                if (shouldCleanup(state.state)) {
                    const cleanedState = cleanupMessages(state.state)
                    return { ...state, state: cleanedState }
                }
                return state
            })

        return {
            /**
             * Creates a new agent runtime and returns its ID.
             * @returns Effect that yields the AgentRuntimeId or fails with BridgeRuntimeCreationError.
             */
            createAgentRuntime: () =>
                Effect.gen(function* () {
                    const id = makeAgentRuntimeId(uuid4());
                    const initialState: BridgeState = {
                        messages: EMPTY_MESSAGES,
                        lastCleanup: Date.now(),
                        retention: DEFAULT_RETENTION_CONFIG
                    };
                    return yield* agentRuntimeService.create(id, initialState).pipe(
                        Effect.map(() => id),
                        Effect.catchAll((error) => Effect.fail(new BridgeRuntimeCreationError({
                            method: "createAgentRuntime",
                            cause: error
                        })))
                    );
                }),

            /**
             * Sends a message to the specified agent runtime.
             *
             * @param id - The AgentRuntimeId to send the message to.
             * @param message - The message to send.
             * @returns Effect that completes on success or fails with BridgeRuntimeNotFoundError or BridgeMessageSendError.
             *
             * @remarks
             * The `sequence` field is currently set to the current timestamp (Date.now()).
             * If strict, monotonic sequence numbers are required, a dedicated sequence generator
             * should be used. Here, the timestamp is used for ordering and uniqueness.
             */
            sendMessage: (id: AgentRuntimeId, message: string) =>
                Effect.gen(function* () {
                    if (!isValidAgentRuntimeId(id)) {
                        return yield* Effect.fail(new BridgeRuntimeNotFoundError({
                            runtimeId: id ?? "",
                            method: "sendMessage",
                            cause: "Missing or invalid agent runtime ID"
                        }));
                    }

                    const sequence = yield* sequenceGenerator.next();
                    const now = Date.now();

                    const record: AgentActivity = {
                        id: uuid4(),
                        agentRuntimeId: id,
                        timestamp: now,
                        type: EVENT_TYPE,
                        payload: { message },
                        sequence,
                        metadata: {}
                    };

                    // Update state with new message
                    const state = yield* getStateWithCleanup<BridgeState>(id);
                    const newMessage: BridgeMessage = {
                        content: message,
                        timestamp: now,
                        sequence
                    };
                    const newState = {
                        ...state.state,
                        messages: [newMessage, ...state.state.messages]
                    };

                    return yield* Effect.all([
                        agentRuntimeService.send(id, record),
                        agentRuntimeService.create(id, newState)
                    ]).pipe(
                        Effect.catchAll((error) => Effect.fail(new BridgeMessageSendError({
                            runtimeId: id,
                            message,
                            method: "sendMessage",
                            cause: error
                        })))
                    );
                }),

            /**
             * Gets the state for the specified agent runtime.
             *
             * @template S - The shape of the custom state managed by the AgentRuntime.
             *   This should match the type used when the runtime was created.
             * @param id - The AgentRuntimeId to query.
             * @returns Effect that yields AgentRuntimeState<S> or fails with BridgeRuntimeNotFoundError or BridgeStateError.
             *
             * @remarks
             * The type parameter S must match the state type of the target runtime.
             * If the wrong type is provided, a runtime error may occur.
             */
            getState: <S = unknown>(id: AgentRuntimeId) =>
                isValidAgentRuntimeId(id)
                    ? agentRuntimeService.getState<S>(id).pipe(
                        Effect.catchAll((error) => Effect.fail(new BridgeStateError({
                            runtimeId: id,
                            method: "getState",
                            cause: error
                        })))
                    )
                    : Effect.fail(new BridgeRuntimeNotFoundError({
                        runtimeId: id ?? "",
                        method: "getState",
                        cause: "Missing or invalid agent runtime ID"
                    })),

            /**
             * Subscribes to events for the specified agent runtime.
             * @param id - The AgentRuntimeId to subscribe to.
             * @returns Effect that yields the subscription or fails with BridgeRuntimeNotFoundError or BridgeSubscriptionError.
             */
            subscribe: (id: AgentRuntimeId) =>
                isValidAgentRuntimeId(id)
                    ? agentRuntimeService.subscribe(id).pipe(
                        Stream.catchAll((error) =>
                            Stream.fail(new BridgeSubscriptionError({
                                runtimeId: id,
                                method: "subscribe",
                                cause: error
                            }))
                        )
                    )
                    : Stream.fail(new BridgeRuntimeNotFoundError({
                        runtimeId: id ?? "",
                        method: "subscribe",
                        cause: "Missing or invalid agent runtime ID"
                    })),

            /**
             * Terminates the specified agent runtime.
             * @param id - The AgentRuntimeId to terminate.
             * @returns Effect that completes on success or fails with BridgeRuntimeNotFoundError or BridgeTerminationError.
             */
            terminate: (id: AgentRuntimeId) =>
                isValidAgentRuntimeId(id)
                    ? agentRuntimeService.terminate(id).pipe(
                        Effect.catchAll((error) => Effect.fail(new BridgeTerminationError({
                            runtimeId: id,
                            method: "terminate",
                            cause: error
                        })))
                    )
                    : Effect.fail(new BridgeRuntimeNotFoundError({
                        runtimeId: id ?? "",
                        method: "terminate",
                        cause: "Missing or invalid agent runtime ID"
                    }))
        };
    }),
    /**
     * Explicit dependencies: AgentRuntimeService and UuidGeneratorService.
     */
    dependencies: [AgentRuntimeService.Default, SequenceGenerator.Default]
}) { }