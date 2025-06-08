import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"

export const FileSystemLive = NodeContext.layer

export const readFile = (path: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.readFileString(path)
    })

export const writeFile = (path: string, content: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.writeFileString(path, content)
    })

export const exists = (path: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.exists(path)
    })

export const makeDirectory = (path: string) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.makeDirectory(path)
    })

export const remove = (path: string, options?: { recursive?: boolean }) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        return yield* fs.remove(path, options)
    }) 