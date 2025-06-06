/**
 * @file WebSocket message parsing and stringification utilities.
 */
import type { AgentActivity } from "@/ea-actor-runtime/types.js"
import { Effect } from "effect"

/**
 * Safely parses a WebSocket message string into an AgentActivity object.
 * @param message The raw WebSocket message string.
 */
export const wsParse = (message: string): Effect.Effect<AgentActivity, SyntaxError> =>
    Effect.try({
        try: () => JSON.parse(message) as AgentActivity,
        catch: (error) => new SyntaxError(`Failed to parse WebSocket message: ${error}`),
    })

/**
 * Safely stringifies an AgentActivity object for sending over WebSocket.
 * @param activity The AgentActivity object.
 */
export const wsStringify = (activity: AgentActivity): string => JSON.stringify(activity) 