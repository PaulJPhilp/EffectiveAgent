import { Command } from "@effect/cli"
import { Effect } from "effect"

export const addCommand = Command.make("add", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement add logic
        return yield* Effect.succeed("Added new component")
    })
) 