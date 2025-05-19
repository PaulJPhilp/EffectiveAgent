import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { withTestLogger } from "./test-helpers.js"


describe("Logger Pattern Example", () => {
    it("should log info and debug messages to file", async () => {
        await withTestLogger("logger-pattern-test", Effect.gen(function* () {
            yield* Effect.logInfo("This is an info log", { foo: "bar" })
            yield* Effect.logDebug("This is a debug log", { value: 42 })
            expect(1 + 1).toBe(2)
            return undefined as never
        }))
    })
}) 