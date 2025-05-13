/**
 * @file Implements a monotonic sequence generator service
 * @module services/core/sequence/sequence-generator
 */

import { Effect } from "effect"

/**
 * API contract for the SequenceGenerator service
 */
export interface SequenceGeneratorApi {
    /**
     * Generates the next sequence number
     * @returns Effect that yields a monotonically increasing number
     */
    next(): Effect.Effect<number, never>

    /**
     * Resets the sequence generator.
     * Should only be used in test scenarios.
     */
    reset(): Effect.Effect<void, never>
}

/**
 * Implementation of the SequenceGenerator service using the Effect.Service pattern.
 * Provides atomic sequence number generation with monotonic guarantees.
 */
export class SequenceGenerator extends Effect.Service<SequenceGeneratorApi>()("SequenceGenerator", {
    effect: Effect.gen(function* () {
        // Private sequence counter
        let currentSequence = 0n

        return {
            next: () => Effect.sync(() => {
                currentSequence = currentSequence + 1n
                // Convert to number, safe since we're unlikely to exceed Number.MAX_SAFE_INTEGER
                // in a single session. If needed, we could return BigInt instead.
                return Number(currentSequence)
            }),

            reset: () => Effect.sync(() => {
                currentSequence = 0n
            })
        }
    })
}) { }
