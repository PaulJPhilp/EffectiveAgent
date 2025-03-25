import { describe, expect, it, vi } from 'vitest'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import type { AgentState } from '../Agent.js'
import { AgentStatus } from '../Agent.js'
import { AgentNode } from '../AgentNode.js'

interface TestState extends AgentState<unknown, unknown, unknown> { }

class TestNode extends AgentNode<TestState> {
    constructor(taskService: TaskService) {
        super(taskService)
    }

    async execute(state: TestState): Promise<TestState> {
        return {
            ...state,
            status: AgentStatus.COMPLETED,
            agentRun: {
                ...state.agentRun,
                completedSteps: [...(state.agentRun.completedSteps || []), 'test_execute']
            }
        }
    }
}

describe('AgentNode', () => {
    it('should execute node logic and update state', async () => {
        const mockTaskService = new TaskService()
        const node = new TestNode(mockTaskService)
        const initialState: TestState = {
            config: {} as any,
            agentRun: {
                runId: 'test',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: {},
            output: {},
            agentState: {}
        }

        const result = await node.execute(initialState)

        expect(result.status).toBe(AgentStatus.COMPLETED)
        expect(result.agentRun.completedSteps).toContain('test_execute')
    })

    it('should handle errors during execution', async () => {
        const mockTaskService = new TaskService()
        const node = new TestNode(mockTaskService)
        vi.spyOn(node, 'execute').mockRejectedValue(new Error('Test error'))

        const initialState: TestState = {
            config: {} as any,
            agentRun: {
                runId: 'test',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: {},
            output: {},
            agentState: {}
        }

        const runnable = node.runnable()
        const result = await runnable(initialState)

        expect(result.status).toBe(AgentStatus.FAILED)
        expect(result.errors.errors[0]).toContain('Test error')
        expect(result.errors.errorCount).toBe(1)
        expect(result.logs.logs).toContain('Error in TestNode: Test error')
    })
}) 