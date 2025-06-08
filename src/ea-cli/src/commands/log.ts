import { Command } from "@effect/cli"
import { Effect } from "effect"

export const logCommand = Command.make("log", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement log viewing logic
        return yield* Effect.succeed("Logs displayed")
    })
) 