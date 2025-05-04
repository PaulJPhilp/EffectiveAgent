// src/effector/effector.contract.ts

import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import type { AgentRecord } from "@/agent-record/agent-record.types"; // Adjust path as needed
import type { EffectorId } from "./effector.types"; // Adjust path as needed

/**
 * Defines the public interface for interacting with a running Effector instance.
 *
 * An Effector is a stateful, message-driven component that processes AgentRecords sequentially.
 *
 * @template S The type of the Effector's internal state. This is often opaque
 *             to consumers, who interact primarily via messages.
 */
export interface Effector<S = unknown> {
    /**
     * The unique identifier assigned to this specific Effector instance.
     */
    readonly id: EffectorId;

    /**
     * Sends an AgentRecord message to the Effector's internal mailbox (Queue)
     * for asynchronous processing.
     *
     * This operation uses a non-blocking semantic (`Queue.offer` internally).
     * The returned Effect succeeds when the message is successfully offered to the queue.
     * It fails if the Effector's mailbox is shut down (e.g., the Effector is terminating).
     *
     * @param record The AgentRecord message to send to the Effector.
     * @returns An Effect that yields `void` on successful queuing, or fails with
     *          a `Queue.EnqueueError` if the mailbox is not available.
     */
    readonly send: (
        record: AgentRecord,
    ) => Effect.Effect<void, Queue.EnqueueError>;

    /**
     * Retrieves the current internal state of the Effector.
     *
     * @remarks
     * **Caution:** Directly accessing state bypasses the message-passing paradigm.
     * Prefer interacting with Effectors via `send` whenever possible to maintain
     * encapsulation and adhere to the Actor model principles. This method might be
     * useful for debugging or specific read-only scenarios.
     *
     * @returns An Effect yielding the current state `S`.
     */
    // readonly getState: Effect.Effect<S>;
}
