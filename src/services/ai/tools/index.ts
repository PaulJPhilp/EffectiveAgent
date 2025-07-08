/**
 * @file Main exports for the Tool Service.
 * @module services/ai/tools
 */

// Export the service API and Tag
export * from "./api.js";

// Export error types
export * from "./errors.js";

// Export schemas
export {
  EffectImplementation,
  EffectiveTool,
  FullToolName,
  HttpImplementation,
  McpImplementation,
  SimpleToolName,
  ToolImplementation,
  ToolMetadata,
} from "./schema.js";

// Export runtime types
export * from "./types.js";
