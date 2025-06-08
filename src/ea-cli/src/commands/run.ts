import { Command } from "@effect/cli"
import { Effect } from "effect"

export const runCommand = Command.make("run", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement run logic
        return yield* Effect.succeed("Component running")
    })
) 