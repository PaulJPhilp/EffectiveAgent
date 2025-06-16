import { join } from "node:path"
// Boilerplate agent creation logic
import { Effect } from "effect"
import {
  createDir,
  exists,
  writeFileString,
  writeJson,
} from "../services/fs.js"
import {
  agentIndexTemplate,
  agentPackageJsonTemplate,
  agentTestTemplate,
  tsConfigTemplate,
  vitestConfigTemplate,
} from "./templates.js"

/**
 * Creates a new agent with the specified name, including all necessary files and configurations.
 */
export function createAgent(agentName: string) {
  return Effect.gen(function* () {
    // Base directories
    const agentPath = join(process.cwd(), "agents", agentName)
    const srcPath = join(agentPath, "src")
    const testPath = join(agentPath, "__tests__")

    // Check if agent already exists
    if (yield* exists(agentPath)) {
      throw new Error(`EEXIST: Directory already exists: ${agentPath}`)
    }

    // Create directories with recursive option
    yield* createDir(agentPath, { recursive: true })
    yield* createDir(srcPath, { recursive: true })
    yield* createDir(testPath, { recursive: true })

    // Write package.json
    yield* writeJson(
      join(agentPath, "package.json"),
      agentPackageJsonTemplate(agentName),
    )

    // Write tsconfig.json
    yield* writeJson(join(agentPath, "tsconfig.json"), tsConfigTemplate)

    // Write vitest.config.ts
    yield* writeFileString(
      join(agentPath, "vitest.config.ts"),
      vitestConfigTemplate,
    )

    // Write agent source file
    yield* writeFileString(join(srcPath, "index.ts"), agentIndexTemplate)

    // Write agent test file
    yield* writeJson(join(testPath, "index.test.ts"), agentTestTemplate)
  })
}
