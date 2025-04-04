import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { SchedulerTool } from "../tools/scheduler-tool.js"
import { type ToolExecutionContext } from "../types/index.js"

describe("SchedulerTool", () => {
    let tool: SchedulerTool
    let context: ToolExecutionContext

    beforeEach(() => {
        tool = new SchedulerTool()
        context = {
            logging: {
                info: (message: string, data?: unknown) => Effect.succeed(undefined),
                error: (message: string, data?: unknown) => Effect.succeed(undefined),
                debug: (message: string, data?: unknown) => Effect.succeed(undefined),
                warn: (message: string, data?: unknown) => Effect.succeed(undefined)
            },
            configuration: {
                get: () => Effect.succeed({}),
                set: () => Effect.succeed(undefined),
                delete: () => Effect.succeed(undefined)
            }
        }
    })

    it("should have correct metadata", () => {
        expect(tool.id).toBe("scheduler")
        expect(tool.name).toBe("Scheduler")
        expect(tool.description).toBeDefined()
        expect(tool.tags).toContain("scheduling")
    })

    it("should validate input schema", () => {
        const input = {
            interval: 1000,
            maxAttempts: 3,
            exponentialBackoff: true,
            jitter: true,
            effect: {
                type: "test",
                config: {}
            }
        }

        const result = tool.inputSchema.safeParse(input)
        expect(result.success).toBe(true)
    })

    it("should reject invalid input", () => {
        const input = {
            interval: 0,
            effect: {
                type: "test",
                config: {}
            }
        }

        const result = tool.inputSchema.safeParse(input)
        expect(result.success).toBe(false)
    })

    it("should execute with basic configuration", async () => {
        const input = {
            interval: 10,
            maxAttempts: 1,
            effect: {
                type: "test",
                config: {}
            }
        }

        await expect(Effect.runPromise(tool.execute(input, context))).rejects.toThrow("Failed to execute scheduled effect")
    })

    it("should execute with exponential backoff", async () => {
        const input = {
            interval: 10,
            maxAttempts: 1,
            exponentialBackoff: true,
            effect: {
                type: "test",
                config: {}
            }
        }

        await expect(Effect.runPromise(tool.execute(input, context))).rejects.toThrow("Failed to execute scheduled effect")
    })

    it("should execute with jitter", async () => {
        const input = {
            interval: 10,
            maxAttempts: 1,
            jitter: true,
            effect: {
                type: "test",
                config: {}
            }
        }

        await expect(Effect.runPromise(tool.execute(input, context))).rejects.toThrow("Failed to execute scheduled effect")
    })
}) 