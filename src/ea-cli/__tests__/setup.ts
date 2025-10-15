import { FileSystem, Path } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"
import { initCommand } from "../src/commands/init.js"
import { runCommand } from "./test-utils.js"

const setupEnvironment = (): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const path = yield* Path.Path
    const cwd = process.cwd()
    process.env.PROJECT_ROOT = path.join(cwd, "test-project")
    process.env.MASTER_CONFIG_PATH = path.join(
      cwd,
      "test-project/ea-config/master-config.json",
    )
  }).pipe(Effect.provide(Path.layer))

const _removeFile = (path: string): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.remove(path).pipe(Effect.catchAll(() => Effect.succeed(void 0)))
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.orDie) as Effect.Effect<
    void,
    never,
    never
  >

export const cleanupTestDirs = (): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    yield* fs.remove("test-project").pipe(Effect.catchAll(() => Effect.void))
  }).pipe(Effect.provide(NodeFileSystem.layer))

export const setupTestWorkspace = (): Effect.Effect<void, never, never> =>
  Effect.gen(function* () {
    // Clean up existing test directories
    yield* cleanupTestDirs()

    // Initialize test project
    yield* runCommand(initCommand, ["test-project"]).pipe(
      Effect.catchAll(() => Effect.succeed(void 0)),
    )

    // Set up environment variables
    yield* setupEnvironment()
  }).pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodeContext.layer),
    Effect.provide(Path.layer),
    Effect.orDie,
  ) as Effect.Effect<void, never, never>
