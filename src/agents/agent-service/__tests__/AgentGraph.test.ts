import { describe, expect, it, vi } from 'vitest'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import { ProviderService } from '../../../shared/services/provider/providerService.js'
import { TaskService } from '../../../shared/services/task/TaskService.js'
import type { AgentState } from '../Agent.js'
import { AgentStatus } from '../Agent.js'
import { AgentGraphConfig, createAgentGraph } from '../AgentGraph.js'
import { AgentNode } from '../AgentNode.js'
import { createLangGraphAgentGraph } from '../LangGraphAgentGraph.js'

// Mock the services manually
const mockTaskService = {
    getTask: vi.fn().mockResolvedValue({}),
    executeTask: vi.fn().mockResolvedValue({})
} as unknown as TaskService

const mockProviderService = {
    getProvider: vi.fn().mockResolvedValue({}),
    executeProvider: vi.fn().mockResolvedValue({})
} as unknown as ProviderService

const mockModelService = {
    getModel: vi.fn().mockResolvedValue({}),
    executeModel: vi.fn().mockResolvedValue({})
} as unknown as ModelService

const mockPromptService = {
    getPrompt: vi.fn().mockResolvedValue({}),
    executePrompt: vi.fn().mockResolvedValue({})
} as unknown as PromptService

// Custom state for testing
interface TestState extends AgentState<
    { input?: string },
    { result?: string, secondResult?: string },
    { testValue?: string, secondValue?: string }
> { }

// Create mock AgentConfig
const mockConfig = {
    name: 'test-agent',
    description: 'Test agent',
    version: '1.0.0',
    rootPath: '/test',
    agentPath: '/test/agent',
    inputPath: '/test/input',
    outputPath: '/test/output',
    logPath: '/test/logs',
    maxConcurrency: 1,
    maxRetries: 3,
    retryDelay: 1000,
    configFiles: {
        providers: 'providers.json',
        models: 'models.json',
        prompts: 'prompts.json',
        tasks: 'tasks.json'
    }
}

// Test node implementation
class TestNode extends AgentNode<TestState> {
    constructor() {
        super(
            mockTaskService,
            mockProviderService,
            mockModelService,
            mockPromptService
        )
    }

    async execute(state: TestState): Promise<TestState> {
        return {
            ...state,
            status: AgentStatus.COMPLETED,
            output: {
                ...state.output,
                result: 'test_executed'
            },
            agentState: {
                ...state.agentState,
                testValue: 'executed'
            }
        }
    }
}

// Second test node
class SecondTestNode extends AgentNode<TestState> {
    constructor() {
        super(
            mockTaskService,
            mockProviderService,
            mockModelService,
            mockPromptService
        )
    }

    async execute(state: TestState): Promise<TestState> {
        return {
            ...state,
            status: AgentStatus.COMPLETED,
            output: {
                ...state.output,
                secondResult: 'second_executed'
            },
            agentState: {
                ...state.agentState,
                secondValue: 'second_executed'
            }
        }
    }
}

describe('AgentGraph with Dependency Injection', () => {
    // Setup test nodes
    const testNode = new TestNode()
    const secondTestNode = new SecondTestNode()

    it('should execute a simple graph using the default implementation', async () => {
        // Define graph
        const graph = {
            'test_node': {
                node: testNode,
                next: ['END']
            }
        }

        // Create agent graph using the default factory
        const agentGraph = createAgentGraph(
            graph,
            'test_node',
            mockTaskService,
            mockProviderService,
            mockModelService,
            mockPromptService
        )

        // Create initial state
        const initialState: TestState = {
            config: mockConfig,
            agentRun: {
                runId: 'test',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                description: 'Test run',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: { input: 'test' },
            output: {},
            agentState: {}
        }

        // Test with custom AgentGraphConfig
        const graphConfig: AgentGraphConfig = {
            debug: true,
            maxRetries: 2,
            timeout: 30000
        }

        // Run the graph with config
        const result = await agentGraph.runnable()(initialState, graphConfig)

        // Check results
        expect(result.status).toBe(AgentStatus.COMPLETED)
        expect(result.output.result).toBe('test_executed')
        expect(result.agentState.testValue).toBe('executed')
    })

    it('should execute a multi-step graph using the LangGraph implementation', async () => {
        // Define graph
        const graph = {
            'test_node': {
                node: testNode,
                next: ['second_node']
            },
            'second_node': {
                node: secondTestNode,
                next: ['END']
            }
        }

        // Create agent graph using the LangGraph factory
        const agentGraph = createLangGraphAgentGraph(
            graph,
            'test_node',
            mockTaskService,
            mockProviderService,
            mockModelService,
            mockPromptService
        )

        // Create initial state
        const initialState: TestState = {
            config: mockConfig,
            agentRun: {
                runId: 'test',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                description: 'Test run',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: { input: 'test' },
            output: {},
            agentState: {}
        }

        // Test with custom AgentGraphConfig
        const graphConfig: AgentGraphConfig = {
            debug: true,
            maxRetries: 2,
            timeout: 30000
        }

        // Run the graph with config
        const result = await agentGraph.runnable()(initialState, graphConfig)

        // Check results
        expect(result.status).toBe(AgentStatus.COMPLETED)
        expect(result.output.result).toBe('test_executed')
        expect(result.output.secondResult).toBe('second_executed')
        expect(result.agentState.testValue).toBe('executed')
        expect(result.agentState.secondValue).toBe('second_executed')
    })

    it('should allow swapping implementations via dependency injection', async () => {
        // Define graph
        const graph = {
            'test_node': {
                node: testNode,
                next: ['END']
            }
        }

        // Create a mock factory
        const mockExecute = vi.fn().mockImplementation((state) => {
            return {
                ...state,
                status: AgentStatus.COMPLETED,
                output: { result: 'mock_executed' },
                agentState: { testValue: 'mock_executed' }
            }
        })

        // Custom factory implementation
        const mockFactory = {
            createAgentGraph: () => ({
                runnable: () => async (state: TestState, config?: AgentGraphConfig) => mockExecute(state),
                setDebug: () => { }
            })
        }

        // Create agent graph using the mock factory
        const agentGraph = createAgentGraph(
            graph,
            'test_node',
            mockTaskService,
            mockProviderService,
            mockModelService,
            mockPromptService,
            mockFactory
        )

        // Create initial state
        const initialState: TestState = {
            config: mockConfig,
            agentRun: {
                runId: 'test',
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                description: 'Test run',
                completedSteps: []
            },
            status: AgentStatus.RUNNING,
            logs: { logs: [], logCount: 0 },
            errors: { errors: [], errorCount: 0 },
            input: { input: 'test' },
            output: {},
            agentState: {}
        }

        // Test with custom AgentGraphConfig
        const graphConfig: AgentGraphConfig = {
            debug: true,
            maxRetries: 2,
            timeout: 30000
        }

        // Run the graph with config
        const result = await agentGraph.runnable()(initialState, graphConfig)

        // Check results
        expect(mockExecute).toHaveBeenCalled()
        expect(result.output.result).toBe('mock_executed')
        expect(result.agentState.testValue).toBe('mock_executed')
    })
}) 