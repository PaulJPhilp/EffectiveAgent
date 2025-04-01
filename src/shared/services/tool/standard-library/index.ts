import { calculatorTool } from "./calculator.tool.js"
import { webSearchTool } from "./web-search.tool.js"

/**
 * An array containing all standard tools provided by the library.
 * Can be used to easily register all standard tools with the ToolService.
 */
export const standardTools = [
    calculatorTool,
    webSearchTool
    // Add other standard tools here as they are created
] as const // Use 'as const' for better type inference if needed

// Optionally, export individual tools if direct access is desired elsewhere
export { calculatorTool, webSearchTool }
