import {
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js";
import { AgentActivity, AgentRecordType, AgentRuntimeId } from "@/agent-runtime/types.js";
import type { BridgeServiceApi } from "./api.js";

import { Effect, Stream } from "effect";
import {
    BridgeMessageSendError,
    BridgeRuntimeCreationError,
    BridgeRuntimeNotFoundError,
    BridgeStateError,
    BridgeSubscriptionError,
    BridgeTerminationError
} from "./errors.js";
import { BridgeState } from "./types.js";

/**
 * Implementation of the Bridge Service
 */
/**
 * Type guard to validate AgentRuntimeId.
 * @param id - The AgentRuntimeId to validate.
 * @returns True if valid, false otherwise.
 */
/**
 * An empty string array for BridgeState initialization.
 */
const EMPTY_MESSAGES: string[] = [];

/**
 * The AgentRecordType for event messages.
 */
const EVENT_TYPE: typeof AgentRecordType.EVENT = AgentRecordType.EVENT;

function isValidAgentRuntimeId(id: AgentRuntimeId | undefined | null): boolean {
    return typeof id === "string" && id.trim().length > 0;
}

/**
 * Interface for UUID generation.
 */
export interface UuidGeneratorApi {
    /**
     * Generates a new UUID string.
     * @returns {string} A new UUID.
     */
    generate(): string;
}

/**
 * UuidGeneratorService - default implementation using crypto.randomUUID().
 */
export const UuidGeneratorService = Effect.Service<UuidGeneratorApi>()(
    "UuidGeneratorService",
    {
        effect: Effect.sync(() => ({
            generate: () => crypto.randomUUID()
        })),
        dependencies: []
    }
);

export class BridgeService extends Effect.Service<BridgeServiceApi>()("BridgeService", {
    effect: Effect.gen(function* () {
        // Obtain dependencies
        const agentRuntimeService = yield* AgentRuntimeService;
        /**
         * Obtain the UUID generator dependency for testability.
         */
        const uuidGenerator = yield* UuidGeneratorService;

        // Return implementation object with all API methods
        return {
            /**
             * Creates a new agent runtime and returns its ID.
             * @returns Effect that yields the AgentRuntimeId or fails with BridgeRuntimeCreationError.
             */
            createAgentRuntime: () =>
                Effect.gen(function* () {
                    const id = makeAgentRuntimeId(uuidGenerator.generate());
                    const initialState: BridgeState = { messages: EMPTY_MESSAGES };
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
                    const record: AgentActivity = {
                        id: uuidGenerator.generate(),
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: EVENT_TYPE,
                        payload: { message },
                        // Using timestamp as sequence for ordering; update if stricter sequencing is needed
                        sequence: Date.now(),
                        metadata: {}
                    };
                    return yield* agentRuntimeService.send(id, record).pipe(
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
    dependencies: [AgentRuntimeService.Default, UuidGeneratorService.Default]
}) { } // Empty class body