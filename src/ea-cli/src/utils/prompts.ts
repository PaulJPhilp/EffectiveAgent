import { Prompt } from "@effect/cli"
import { Effect } from "effect"

export interface PromptOptions {
  readonly type: "text" | "confirm" | "select"
  readonly message: string
  readonly defaultValue?: string | boolean
  readonly choices?: ReadonlyArray<string>
}

export const prompt = (options: PromptOptions) =>
  Effect.gen(function* () {
    switch (options.type) {
      case "confirm":
        return yield* Prompt.confirm({
          message: options.message,
        })
      case "text":
        return yield* Prompt.text({
          message: options.message,
        })
      case "select":
        return yield* Prompt.select({
          message: options.message,
          choices: (options.choices || []).map(choice => ({ title: choice, value: choice })),
        })
      default:
        return yield* Effect.fail(new Error(`Unsupported prompt type: ${options.type}`))
    }
  })
