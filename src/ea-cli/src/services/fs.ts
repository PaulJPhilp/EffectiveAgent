import { join } from "node:path"
import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"

// Create directory if it doesn't exist
export const createDir = (path: string, options?: { recursive?: boolean }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const exists = yield* fs.exists(path)
    if (!exists) {
      yield* fs.makeDirectory(path, options)
    }
  })

// Write JSON file
export const writeJson = (path: string, data: unknown) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.writeFileString(path, JSON.stringify(data, null, 2))
  })

// Write plain text file
export const writeFileString = (path: string, data: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.writeFileString(path, data)
  })

// Initialize project structure
export const initializeProject = (projectPath: string) =>
  Effect.gen(function* () {
    // Create main directories
    yield* createDir(projectPath)
    yield* createDir(join(projectPath, "ea-config"))
    yield* createDir(join(projectPath, "agents"))
    yield* createDir(join(projectPath, "logs"))
  })

// Check if a file or directory exists
export const exists = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.exists(path)
  })

// Layer for providing NodeContext
export const FileSystemLayer = NodeContext.layer
