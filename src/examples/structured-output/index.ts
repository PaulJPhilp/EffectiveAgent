/**
 * @file Entry point for the StructuredOutputAgent module
 * @module examples/structured-output
 */

export type {
    GenerateStructuredOutputPayload, SchemaValidatorToolApi, StructuredOutputPipelineApi
} from "./api.js";

export {
    SchemaValidationError, StructuredOutputPipelineError
} from "./errors.js";

export {
    // Agent Implementation using AgentRuntime
    StructuredOutputAgent
} from "./agent.js";

