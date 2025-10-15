import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Data, Effect, Either, Layer } from "effect"

const program = FileSystem.FileSystem.pipe(
	Effect.andThen(({ exists }) => exists(`test`)),
	Effect.provide(NodeContext.layer)
)