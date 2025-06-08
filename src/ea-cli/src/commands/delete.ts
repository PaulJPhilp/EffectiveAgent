import { Command } from "@effect/cli"
import { Effect } from "effect"

export const deleteCommand = Command.make("delete", {}, () =>
    Effect.gen(function* () {
        // TODO: Implement delete logic
        return yield* Effect.succeed("Component deleted")
    })
) 