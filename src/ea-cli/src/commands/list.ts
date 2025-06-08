import { Command } from "@effect/cli"
import { Effect } from "effect"

export const listCommand = Command.make("list", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement list logic
        return yield* Effect.succeed("Available components listed")
    })
) 