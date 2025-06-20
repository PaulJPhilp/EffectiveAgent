import { join } from "node:path"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
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
    yield* createDir(projectPath, { recursive: true })
    yield* createDir(join(projectPath, "ea-config"), { recursive: true })
    yield* createDir(join(projectPath, "agents"), { recursive: true })
    yield* createDir(join(projectPath, "logs"), { recursive: true })
  })

// Check if a file or directory exists
export const exists = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.exists(path)
  })

// Layer for providing FileSystem
export const FileSystemLayer = NodeFileSystem.layer
