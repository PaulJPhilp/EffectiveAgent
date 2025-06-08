import { Command } from "@effect/cli"
import { Effect } from "effect"

export const serveCommand = Command.make("serve", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement server logic
        return yield* Effect.succeed("Server started")
    })
) 