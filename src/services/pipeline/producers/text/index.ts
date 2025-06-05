/**
 * @file Index file for Text Service
 * @module services/pipeline/producers/text
 */

export type { TextServiceApi } from "./api.js";
export { TextServiceError } from "./errors.js";
export type { TextCompletionInput, TextCompletionOutput } from "./schema.js";
export {
    TextService, type TextAgentState,
    type TextGenerationOptions
} from "./service.js";

