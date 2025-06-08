import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
import { join } from "path"

// FileSystem operations service
export class FileSystemOps {
    // Create directory if it doesn't exist
    static createDir = (path: string) =>
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            const exists = yield* fs.exists(path)
            if (!exists) {
                yield* fs.makeDirectory(path)
            }
        })

    // Write JSON file
    static writeJson = (path: string, data: unknown) =>
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            yield* fs.writeFileString(
                path,
                JSON.stringify(data, null, 2)
            )
        })

    // Initialize project structure
    static initializeProject = (projectPath: string) =>
        Effect.gen(function* () {
            // Create main directories
            yield* FileSystemOps.createDir(projectPath)
            yield* FileSystemOps.createDir(join(projectPath, "ea-config"))
            yield* FileSystemOps.createDir(join(projectPath, "agents"))
            yield* FileSystemOps.createDir(join(projectPath, "logs"))
        })

    // Check if a file or directory exists
    static exists = (path: string) =>
        Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            return yield* fs.exists(path)
        })
}

// Layer for providing NodeContext
export const FileSystemLayer = NodeContext.layer 