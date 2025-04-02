import { Effect } from "effect"
import { ConfigLoader } from "../../configuration/types.js"
import { AgentToolConfig, ToolLibraryConfig } from "../tool-configuration-service.js"

export const validLibraryConfig: ToolLibraryConfig = {
    name: "test-library",
    description: "Test library for unit tests",
    version: "1.0.0",
    path: "./test-library",
    tools: ["test-tool"],
    tags: ["test", "typescript"]
}

export const validAgentConfig: AgentToolConfig = {
    standardLibrary: {
        path: "./test-standard",
        include: ["test-tool"],
        exclude: []
    }
}

export function createMockConfigLoader(): ConfigLoader {
    return {
        loadConfig: (_path: string) => {
            if (_path === "valid.json") {
                if (_path.includes("library")) {
                    return Effect.succeed(validLibraryConfig)
                }
                return Effect.succeed(validAgentConfig)
            }
            return Effect.fail(new Error("ConfigValidationError: Invalid configuration schema in invalid.json"))
        }
    }
} 