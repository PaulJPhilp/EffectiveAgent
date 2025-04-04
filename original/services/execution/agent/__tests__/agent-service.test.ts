import { Effect, Layer } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import type { JSONObject } from "../../../../types.js"
import type { AgentConfig, AgentRun } from "../schema.js"
import type { AgentState } from "../types.js"
import { AgentExecutionError, AgentService } from "../types.js"

// Test types
interface TestInput extends JSONObject {
    readonly inputValue: string
}

interface TestOutput extends JSONObject {
    readonly outputValue: string
}

interface TestAgentState extends JSONObject {
    readonly stateValue: string
}

// Mock agent config
const testConfig: AgentConfig = {
    name: "test-agent",
    version: "1.0.0",
    tags: ["test"],
    graph: {
        nodes: [],
        edges: [],
        start_node_id: "start",
        metadata: {}
    },
    settings: {
        model: {
            id: "test-model",
            provider: "test-provider"
        },
        batchSize: 1,
        retryConfig: {
            maxRetries: 3,
            retryDelay: 1000
        },
        paths: {
            input: "/test/input",
            output: "/test/output",
            logs: "/test/logs"
        },
        validation: {
            validateInput: true,
            validateOutput: true
        }
    }
}

// Mock agent run
const testRun: AgentRun = {
    id: "test-run",
    startTime: new Date().toISOString(),
    endTime: undefined,
    status: "running"
}

// Test implementation with error cases
class TestAgentService implements AgentService<TestInput, TestOutput, TestAgentState> {
    private shouldFail = false
    private currentState: "initializing" | "running" | "completed" | "error" = "initializing"

    setShouldFail(fail: boolean) {
        this.shouldFail = fail
    }

    run = (input: TestInput): Effect.Effect<AgentState<TestInput, TestOutput, TestAgentState>, never> => {
        if (this.shouldFail) {
            this.currentState = "error"
            return Effect.succeed({
                config: testConfig,
                agentRun: {
                    ...testRun,
                    status: "error",
                    endTime: new Date().toISOString()
                },
                status: {
                    overallStatus: "error",
                    nodeHistory: [{
                        nodeId: "test-node",
                        status: "error",
                        error: "Test error",
                        timestamp: new Date().toISOString()
                    }],
                    currentNode: undefined
                },
                logs: {
                    logs: ["Error occurred during execution"],
                    logCount: 1
                },
                errors: {
                    errors: ["Test error"],
                    errorCount: 1
                },
                input,
                output: {} as TestOutput,
                agentState: {
                    stateValue: "error-state"
                }
            })
        }

        this.currentState = "completed"
        return Effect.succeed({
            config: testConfig,
            agentRun: {
                ...testRun,
                status: "completed",
                endTime: new Date().toISOString()
            },
            status: {
                overallStatus: "completed",
                nodeHistory: [{
                    nodeId: "test-node",
                    status: "completed",
                    timestamp: new Date().toISOString()
                }],
                currentNode: undefined
            },
            logs: {
                logs: ["Execution completed successfully"],
                logCount: 1
            },
            errors: {
                errors: [],
                errorCount: 0
            },
            input,
            output: {
                outputValue: `processed-${input.inputValue}`
            },
            agentState: {
                stateValue: "test-state"
            }
        })
    }

    buildGraph = (): Effect.Effect<void, AgentExecutionError> => {
        if (this.shouldFail) {
            return Effect.fail(new AgentExecutionError({ message: "Failed to build graph" }))
        }
        return Effect.succeed(undefined)
    }

    saveLangGraphConfig = (outputPath?: string): Effect.Effect<void, AgentExecutionError> => {
        if (this.shouldFail) {
            return Effect.fail(new AgentExecutionError({ message: "Failed to save graph config" }))
        }
        return Effect.succeed(undefined)
    }
}

describe("AgentService", () => {
    let testService: TestAgentService
    let testLayer: Layer.Layer<never, never, AgentService<TestInput, TestOutput, TestAgentState>>

    beforeEach(() => {
        testService = new TestAgentService()
        testLayer = Layer.succeed(AgentService, testService)
    })

    it("should successfully run with valid input", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(AgentService)
            const result = yield* _(service.run({ inputValue: "test" }))
            return result
        })

        const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)))

        expect(result.status.overallStatus).toBe("completed")
        expect(result.output.outputValue).toBe("processed-test")
        expect(result.agentState.stateValue).toBe("test-state")
        expect(result.logs.logs).toContain("Execution completed successfully")
        expect(result.errors.errorCount).toBe(0)
    })

    it("should handle execution failures", async () => {
        testService.setShouldFail(true)

        const program = Effect.gen(function* (_) {
            const service = yield* _(AgentService)
            const result = yield* _(service.run({ inputValue: "test" }))
            return result
        })

        const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)))

        expect(result.status.overallStatus).toBe("error")
        expect(result.errors.errorCount).toBe(1)
        expect(result.errors.errors[0]).toBe("Test error")
        expect(result.logs.logs).toContain("Error occurred during execution")
    })

    it("should handle graph building failures", async () => {
        testService.setShouldFail(true)

        const program = Effect.gen(function* (_) {
            const service = yield* _(AgentService)
            return yield* _(service.buildGraph())
        })

        await expect(
            Effect.runPromise(program.pipe(Effect.provide(testLayer)))
        ).rejects.toThrow("Failed to build graph")
    })

    it("should handle config saving failures", async () => {
        testService.setShouldFail(true)

        const program = Effect.gen(function* (_) {
            const service = yield* _(AgentService)
            return yield* _(service.saveLangGraphConfig("/test/output/graph.json"))
        })

        await expect(
            Effect.runPromise(program.pipe(Effect.provide(testLayer)))
        ).rejects.toThrow("Failed to save graph config")
    })

    it("should track state transitions", async () => {
        const program = Effect.gen(function* (_) {
            const service = yield* _(AgentService)
            const result = yield* _(service.run({ inputValue: "test" }))
            return result
        })

        const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)))

        expect(result.agentRun.status).toBe("completed")
        expect(result.agentRun.endTime).toBeDefined()
        expect(result.status.nodeHistory).toHaveLength(1)
        expect(result.status.nodeHistory[0].status).toBe("completed")
    })
}) 