import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect, } from "effect"

const _program = FileSystem.FileSystem.pipe(
	Effect.andThen(({ exists }) => exists(`test`)),
	Effect.provide(NodeContext.layer)
)