import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"

describe("FileSystem Example", () => {
    it("should check if a file exists", async () => {
        const program = Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            const exists = yield* fs.exists("./test.txt")
            return exists
        })

        const result = await Effect.runPromise(
            program.pipe(
                Effect.provide(NodeContext.layer)
            )
        )
        expect(result).toBe(false)
    })

    it("should write and read a file", async () => {
        const testContent = "Hello, Effect!"
        const testFile = "./test-effect.txt"

        const program = Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem

            // Write file
            yield* fs.writeFileString(testFile, testContent)

            // Read file
            const content = yield* fs.readFileString(testFile)

            // Clean up
            yield* fs.remove(testFile)

            return content
        })

        const result = await Effect.runPromise(
            program.pipe(
                Effect.provide(NodeContext.layer)
            )
        )
        expect(result).toBe(testContent)
    })

    it("should create and remove directories", async () => {
        const testDir = "./effect-test-dir"

        const program = Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem

            // Create directory
            yield* fs.makeDirectory(testDir)

            // Check if exists
            const exists = yield* fs.exists(testDir)

            // Clean up
            yield* fs.remove(testDir, { recursive: true })

            // Verify cleanup
            const existsAfter = yield* fs.exists(testDir)

            return { exists, existsAfter }
        })

        const result = await Effect.runPromise(
            program.pipe(
                Effect.provide(NodeContext.layer)
            )
        )
        expect(result.exists).toBe(true)
        expect(result.existsAfter).toBe(false)
    })
}) 