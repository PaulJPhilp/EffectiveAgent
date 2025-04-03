/**
 * JSON value types
 */
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | JSONObject
    | JSONArray

/**
 * JSON object type
 */
export interface JSONObject {
    [key: string]: JSONValue
}

/**
 * JSON array type
 */
export type JSONArray = JSONValue[]

/**
 * Base state interface for agent nodes
 */
export interface AgentState {
    readonly status: string
    readonly error?: string
    readonly errorCount: number
    readonly completedSteps: string[]
    readonly logs: string[]
}