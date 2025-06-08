import { Console } from "@effect/platform-node"
import { Effect } from "effect"

export interface Prompt {
    readonly type: "text" | "confirm" | "select"
    readonly message: string
    readonly defaultValue?: string | boolean
    readonly choices?: ReadonlyArray<string>
}

export const prompt = (options: Prompt) =>
    Effect.gen(function* () {
        const console = yield* Console.Console

        yield* console.log(options.message)

        if (options.type === "confirm") {
            const response = yield* console.question("(y/N) ")
            return response.toLowerCase().startsWith("y")
        }

        if (options.type === "select" && options.choices) {
            yield* Effect.forEach(options.choices, (choice, index) =>
                console.log(`${index + 1}) ${choice}`)
            )
            const response = yield* console.question("Enter number: ")
            const index = parseInt(response) - 1
            return options.choices[index] ?? options.defaultValue
        }

        const response = yield* console.question("> ")
        return response || options.defaultValue
    }) 