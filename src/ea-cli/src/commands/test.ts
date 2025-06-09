import { Args, Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"

export const testCommand = Command.make(
    "test",
    {
        message: Args.text({ name: "message" }).pipe(
            Args.withDescription("A test message"),
        ),
        verbose: Options.boolean("verbose").pipe(
            Options.withDescription("Enable verbose output"),
        ),
    },
    ({ message, verbose }) =>
        Effect.gen(function* () {
            yield* Console.log(`Message: ${message}`)
            if (verbose) {
                yield* Console.log("Verbose mode enabled")
            }
        }),
).pipe(
    Command.withDescription("A simple test command to debug option parsing"),
)

export default testCommand
