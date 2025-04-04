import { type ConfigurationService } from "../../configuration/configuration-service.js"
import { type LoggingService } from "../../logging/logging-service.js"

/**
 * Context passed to tool execution containing services and configuration
 */
export interface ToolExecutionContext {
    readonly logging: LoggingService
    readonly configuration: ConfigurationService
}

export * from "./tool-service.ts"
export * from "./tool.ts"

