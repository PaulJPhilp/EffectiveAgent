/**
 * @file Index file for Object Service
 * @module services/pipeline/producers/object
 */

export {
    type ObjectAgentState,
    // Object Service Agent Implementation
    default as ObjectService
} from "./service.js";

export * from "./api.js";
export * from "./errors.js";
export * from "./types.js";

