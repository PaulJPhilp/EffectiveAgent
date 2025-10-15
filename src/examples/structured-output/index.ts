/**
 * @file Entry point for the StructuredOutputAgent module
 * @module examples/structured-output
 */


export {
    // Agent Implementation using AgentRuntime
    StructuredOutputAgent
} from "./agent.js";
export type {
    GenerateStructuredOutputPayload, SchemaValidatorToolApi, StructuredOutputPipelineApi
} from "./api.js";
export {
    SchemaValidationError, StructuredOutputPipelineError
} from "./errors.js";

