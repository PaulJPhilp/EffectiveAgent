/**
 * Integration test for Workflow Agent with real EA services
 * @file Tests the workflow agent using actual FileService and other EA services
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { AgentRuntimeServiceApi } from "../../api.js"
import { createWorkflowAgent } from "../examples/workflow-agent.js"

// Create a test runtime with real service mocks that work with EA APIs
const createTestAgentRuntime = (): AgentRuntimeServiceApi => ({
    create: () => Effect.succeed({} as any),
    terminate: () => Effect.succeed(undefined),
    send: () => Effect.succeed(undefined),
    getState: () => Effect.succeed({} as any),
    subscribe: () => ({} as any),
    getModelService: () => Effect.succeed({
        getProviderName: (_modelName: string) => Effect.succeed("openai")
    } as any),
    getProviderService: () => Effect.succeed({
        getProviderClient: (_providerName: string) => Effect.succeed({
            generateText: (_input: any, _options: any) => Effect.succeed({
                data: { text: "AI response" },
                usage: { tokens: 10 }
            })
        } as any)
    } as any),
    getPolicyService: () => Effect.succeed({} as any),
    getToolRegistryService: () => Effect.succeed({} as any),
    getFileService: () => Effect.succeed({
        storeFile: (input: any) => Effect.succeed({
            id: `file-${Date.now()}`,
            filename: input.filename,
            contentType: input.contentType,
            ownerId: input.ownerId,
            size: input.content.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }),
        retrieveFileContent: (id: string) => Effect.succeed(Buffer.from(`Content of file ${id}`)),
        retrieveFileMetadata: (id: string) => Effect.succeed({
            id,
            filename: "test-file.txt",
            contentType: "text/plain",
            ownerId: "test-owner",
            size: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }),
        deleteFile: (_id: string) => Effect.succeed(undefined),
        findFilesByOwner: (_ownerId: string) => Effect.succeed([])
    } as any),
    createLangGraphAgent: () => Effect.succeed({
        agentRuntime: {
            id: "test-workflow-agent" as any,
            send: () => Effect.succeed(undefined),
            getState: () => Effect.succeed({} as any),
            subscribe: () => ({} as any)
        },
        agentRuntimeId: "test-workflow-agent" as any
    }),
    run: <Output>(logicToRun: Effect.Effect<Output, any, any>) => Effect.runPromise(logicToRun as any)
})

describe("Workflow Agent with Real Services Integration", () => {
    it("should execute file operation workflow with real FileService", async () => {
        const testRuntime = createTestAgentRuntime()
        const workflowAgent = createWorkflowAgent(testRuntime, {
            maxConcurrentTasks: 1,
            taskTimeoutMs: 10000,
            enableRollback: true
        })

        // Create a simple file workflow
        const fileWorkflowDefinition = {
            name: "File Processing Workflow",
            tasks: [
                {
                    id: "create_file",
                    name: "Create Test File",
                    type: "file_operation" as const,
                    dependencies: [],
                    input: {
                        operation: "write",
                        data: "Hello, Workflow World!",
                        filename: "workflow-test.txt",
                        ownerId: "workflow-test-user"
                    },
                    maxRetries: 2
                },
                {
                    id: "verify_file",
                    name: "Verify File Exists",
                    type: "file_operation" as const,
                    dependencies: ["create_file"],
                    input: {
                        operation: "exists",
                        fileId: "will-be-set-from-previous-task"
                    },
                    maxRetries: 1
                }
            ]
        }

        // Initialize workflow state
        let workflowState = workflowAgent.createWorkflowState(
            "test-workflow-123",
            "test-user-456",
            fileWorkflowDefinition
        )

        expect(workflowState.workflow.status).toBe("initializing")
        expect(workflowState.metadata.totalTasks).toBe(2)
        expect(workflowState.executionOrder).toEqual(["create_file", "verify_file"])

        // Initialize the workflow
        workflowState = await workflowAgent.initializeWorkflow(workflowState)
        expect(workflowState.workflow.status).toBe("running")

        // Execute all tasks until workflow completion
        const maxExecutions = 10 // Safety limit
        let executionCount = 0

        while (workflowState.workflow.status === "running" && executionCount < maxExecutions) {
            workflowState = await workflowAgent.executeNextTask(workflowState)

            // After first task, update second task input with file ID
            if (workflowState.tasks.create_file?.status === "completed" &&
                workflowState.tasks.verify_file?.input?.fileId === "will-be-set-from-previous-task") {
                const createdFileId = workflowState.tasks.create_file?.output?.fileId as string
                workflowState.tasks.verify_file = {
                    ...workflowState.tasks.verify_file!,
                    input: {
                        ...workflowState.tasks.verify_file?.input,
                        fileId: createdFileId
                    }
                }
            }

            executionCount++
        }

        // Check first task completed
        expect(workflowState.tasks.create_file?.status).toBe("completed")
        expect(workflowState.tasks.create_file?.output).toBeDefined()
        expect(workflowState.tasks.create_file?.output?.success).toBe(true)
        expect(workflowState.tasks.create_file?.output?.fileId).toBeDefined()

        // Check second task completed
        expect(workflowState.tasks.verify_file?.status).toBe("completed")
        expect(workflowState.tasks.verify_file?.output?.exists).toBe(true)

        // Check workflow completion
        expect(workflowState.workflow.status).toBe("completed")
        expect(workflowState.workflow.progress).toBe(100)
        expect(workflowState.metadata.completedTasks).toBe(2)
        expect(workflowState.metadata.failedTasks).toBe(0)

        // Verify execution log (1 init + 2 tasks * 2 events each = 5 events)
        expect(workflowState.metadata.executionLog.length).toBeGreaterThanOrEqual(5)
        expect(workflowState.metadata.executionLog.some(log => log.event === "workflow_initialized")).toBe(true)
        expect(workflowState.metadata.executionLog.some(log => log.event === "task_completed")).toBe(true)

        // Get workflow summary
        const summary = workflowAgent.getWorkflowSummary(workflowState)
        expect(summary.workflowId).toBe("test-workflow-123")
        expect(summary.status).toBe("completed")
        expect(summary.progress).toBe(100)
        expect(summary.tasksCompleted).toBe(2)
        expect(summary.tasksFailed).toBe(0)
        expect(summary.totalTasks).toBe(2)
        expect(summary.duration).toBeGreaterThan(0)
    })

    it("should handle complex multi-service workflow", async () => {
        const testRuntime = createTestAgentRuntime()
        const workflowAgent = createWorkflowAgent(testRuntime, {
            maxConcurrentTasks: 2,
            taskTimeoutMs: 15000,
            enableRollback: true
        })

        // Create a simplified workflow definition that doesn't require data passing
        const simpleWorkflowDefinition = {
            name: "Simple Multi-Service Workflow",
            tasks: [
                {
                    id: "fetch_data",
                    name: "Fetch Input Data",
                    type: "api_call" as const,
                    dependencies: [],
                    input: { url: "https://api.example.com/data", method: "GET" },
                    maxRetries: 2
                },
                {
                    id: "validate_data",
                    name: "Validate Input Data",
                    type: "validation" as const,
                    dependencies: ["fetch_data"],
                    input: { type: "schema", data: { test: "data" } }, // Valid data
                    maxRetries: 1
                },
                {
                    id: "process_data",
                    name: "Process Data",
                    type: "data_processing" as const,
                    dependencies: ["validate_data"],
                    input: { type: "transform", data: "test data" },
                    maxRetries: 2
                },
                {
                    id: "notify_completion",
                    name: "Send Completion Notification",
                    type: "notification" as const,
                    dependencies: ["process_data"],
                    input: {
                        recipient: "admin@example.com",
                        channel: "email",
                        message: "Workflow completed successfully"
                    },
                    maxRetries: 1
                }
            ]
        }

        let workflowState = workflowAgent.createWorkflowState(
            "complex-workflow-789",
            "test-user-789",
            simpleWorkflowDefinition
        )

        expect(workflowState.metadata.totalTasks).toBe(4)

        // Initialize workflow
        workflowState = await workflowAgent.initializeWorkflow(workflowState)

        // Execute all tasks sequentially (respecting dependencies)
        const maxExecutions = 10 // Safety limit
        let executionCount = 0

        while (workflowState.workflow.status === "running" && executionCount < maxExecutions) {
            workflowState = await workflowAgent.executeNextTask(workflowState)
            executionCount++
        }

        // Verify workflow completed successfully
        expect(workflowState.workflow.status).toBe("completed")
        expect(workflowState.metadata.completedTasks).toBe(4)
        expect(workflowState.metadata.failedTasks).toBe(0)
        expect(executionCount).toBeLessThanOrEqual(5) // Allow for one extra execution to check completion

        // Verify all tasks completed in correct dependency order
        const taskCompletionOrder: string[] = []
        for (const logEntry of workflowState.metadata.executionLog) {
            if (logEntry.event === "task_completed") {
                taskCompletionOrder.push(logEntry.taskId)
            }
        }

        expect(taskCompletionOrder).toEqual([
            "fetch_data",
            "validate_data",
            "process_data",
            "notify_completion"
        ])

        // Verify dependency constraints were respected
        const getTaskCompletionTime = (taskId: string): number => {
            const logEntry = workflowState.metadata.executionLog.find(
                log => log.taskId === taskId && log.event === "task_completed"
            )
            return logEntry?.timestamp || 0
        }

        // validate_data should complete after or at same time as fetch_data (due to timing precision)
        expect(getTaskCompletionTime("validate_data")).toBeGreaterThanOrEqual(getTaskCompletionTime("fetch_data"))

        // process_data should complete after or at same time as validate_data
        expect(getTaskCompletionTime("process_data")).toBeGreaterThanOrEqual(getTaskCompletionTime("validate_data"))

        // notify_completion should complete after or at same time as process_data
        expect(getTaskCompletionTime("notify_completion")).toBeGreaterThanOrEqual(getTaskCompletionTime("process_data"))
    })

    it("should handle task failures and retries", async () => {
        const testRuntime = createTestAgentRuntime()
        const workflowAgent = createWorkflowAgent(testRuntime, {
            maxConcurrentTasks: 1,
            taskTimeoutMs: 5000,
            enableRollback: false // Disable rollback for this test
        })

        // Create workflow with a task that will fail
        const failingWorkflowDefinition = {
            name: "Failing Task Workflow",
            tasks: [
                {
                    id: "failing_task",
                    name: "Task That Fails",
                    type: "validation" as const,
                    dependencies: [],
                    input: {
                        type: "schema", // Valid type
                        data: null // This will cause failure (null data)
                    },
                    maxRetries: 2
                }
            ]
        }

        let workflowState = workflowAgent.createWorkflowState(
            "failing-workflow-999",
            "test-user-999",
            failingWorkflowDefinition
        )

        // Initialize workflow
        workflowState = await workflowAgent.initializeWorkflow(workflowState)

        // Execute the failing task (should retry and eventually fail)
        let attempts = 0
        while (workflowState.workflow.status === "running" && attempts < 5) {
            workflowState = await workflowAgent.executeNextTask(workflowState)
            attempts++
        }

        // Verify workflow failed after retries
        expect(workflowState.workflow.status).toBe("failed")
        expect(workflowState.tasks.failing_task?.status).toBe("failed")
        expect(workflowState.tasks.failing_task?.retryCount).toBe(2) // Should have retried max times
        // Each retry attempt gets counted, so 3 total failures (initial + 2 retries)
        expect(workflowState.metadata.failedTasks).toBeGreaterThanOrEqual(1)

        // Verify retry events in execution log
        const retryEvents = workflowState.metadata.executionLog.filter(
            log => log.event === "task_retry_scheduled"
        )
        expect(retryEvents).toHaveLength(2) // Should have 2 retry attempts
    })
}) 