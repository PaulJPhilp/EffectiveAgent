// File: agent.test.ts

import type { ITaskService } from '@services/task/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type {
	AgentConfig,
	AgentState,
	AgentRun,
	AgentStatus,
	AgentLogs,
	AgentErrors,
} from './types.js'; // Assuming types.ts path
import type {
	AgentGraphImplementation,
	AgentGraphConfig,
	GraphDefinition, // Assuming this is exported or defined for buildGraphDefinition
} from './AgentGraph.js'; // Assuming AgentGraph.ts path
import { Agent } from './Agent.js'; // The abstract class we will create

// --- Mock Dependencies ---

const mockTaskService: jest.Mocked<ITaskService> = {
	// Add mock methods as needed by Agent or nodes during tests
	getTaskConfig: jest.fn(),
	executeTask: jest.fn(),
};

const mockProviderService: jest.Mocked<IProviderService> = {
	// Add mock methods
	getProvider: jest.fn(),
	listModels: jest.fn(),
};

const mockModelService: jest.Mocked<IModelService> = {
	// Add mock methods
	getModelConfig: jest.fn(),
	getModelInstance: jest.fn(),
};

const mockPromptService: jest.Mocked<IPromptService> = {
	// Add mock methods
	getPrompt: jest.fn(),
	renderPrompt: jest.fn(),
};

const mockAgentConfig: AgentConfig = {
	// Fill with realistic mock data based on schema.ts
	name: 'Test Agent',
	agentName: 'test-agent',
	description: 'An agent for testing',
	version: '1.0.0',
	rootPath: '/fake/path',
	agentPath: '/fake/path/test-agent',
	inputPath: '/fake/path/test-agent/input',
	outputPath: '/fake/path/test-agent/output',
	logPath: '/fake/path/test-agent/logs',
	maxConcurrency: 1,
	maxRetries: 0,
	retryDelay: 1000,
	debug: false,
	tasks: [], // Add mock task configs if needed
	configFiles: { // These might not be used directly by Agent anymore
		providers: 'providers.json',
		models: 'models.json',
		prompts: 'prompts.json',
		tasks: 'tasks.json',
	},
};

// Mock AgentGraphImplementation
const mockRunnableInnerFn = jest.fn();
const mockGraphImplementation: jest.Mocked<
	AgentGraphImplementation<AgentState<any, any, any>>
> = {
	runnable: jest.fn(() => mockRunnableInnerFn),
	setDebug: jest.fn(),
};

// --- Concrete Test Agent Implementation ---

// Define simple Input/Output/AgentState types for testing
type TestInput = { message: string };
type TestOutput = { reply: string };
type TestAgentStateData = { counter: number };

class TestAgent extends Agent<TestInput, TestOutput, TestAgentStateData> {
	// Implement abstract methods for testing
	protected buildGraphDefinition(): GraphDefinition<
		AgentState<TestInput, TestOutput, TestAgentStateData>
	> {
		// Return a minimal valid graph definition if needed by tests,
		// otherwise, the focus is on the run method's interaction
		// with the *mock* graph implementation.
		return {
			// Minimal graph, content doesn't matter much as we mock the runner
			startNode: { node: {} as any, next: ['END'] },
		};
	}

	protected getStartNodeId(): string {
		return 'startNode';
	}

	// Expose protected methods for potential testing if necessary (generally avoid)
	public testInitializeRunState(
		input: TestInput,
		agentState: TestAgentStateData,
	): AgentState<TestInput, TestOutput, TestAgentStateData> {
		return this.initializeRunState(input, agentState);
	}

	public testCreateErrorState(
		currentState: AgentState<TestInput, TestOutput, TestAgentStateData>,
		error: string,
	): AgentState<TestInput, TestOutput, TestAgentStateData> {
		return this.createErrorState(currentState, error);
	}
}

// --- Test Suite ---

describe('Agent', () => {
	let agent: TestAgent;

	beforeEach(() => {
		// Reset mocks before each test
		jest.clearAllMocks();

		// Create a new agent instance for each test
		agent = new TestAgent(
			mockTaskService,
			mockProviderService,
			mockModelService,
			mockPromptService,
			mockAgentConfig, // Inject mock config
		);
	});

	it('should construct successfully with injected dependencies', () => {
		expect(agent).toBeInstanceOf(TestAgent);
		// Optionally check if services are assigned (if they are public/protected)
		// expect((agent as any).taskService).toBe(mockTaskService);
	});

	describe('run', () => {
		const initialInput: TestInput = { message: 'hello' };
		const initialAgentStateData: TestAgentStateData = { counter: 0 };
		const graphConfig: AgentGraphConfig = { debug: true, timeout: 5000 };

		// Define a plausible initial state structure (built by initializeRunState)
		const expectedInitialStateBase = {
			config: mockAgentConfig,
			// agentRun will have dynamic runId/startTime, checked separately or via objectContaining
			status: { overallStatus: 'running', nodeHistory: [], currentNode: undefined },
			logs: { logs: [], logCount: 0 },
			errors: { errors: [], errorCount: 0 },
			output: {}, // Initially empty
		};

		const finalStateFromGraph: AgentState<
			TestInput,
			TestOutput,
			TestAgentStateData
		> = {
			...expectedInitialStateBase,
			agentRun: {
				runId: 'mock-run-id',
				startTime: new Date().toISOString(),
				outputDir: mockAgentConfig.outputPath,
				inputDir: mockAgentConfig.inputPath,
				description: 'Test Run',
				completedSteps: ['startNode'],
			},
			input: initialInput,
			output: { reply: 'world' },
			agentState: { counter: 1 },
			status: { overallStatus: 'completed', nodeHistory: [{ nodeId: 'startNode', status: 'completed', timestamp: 'ts' }], currentNode: 'END' },
			logs: { logs: ['Graph finished'], logCount: 1 },
			errors: { errors: [], errorCount: 0 },
		};

		it('should call buildGraphDefinition and getStartNodeId', async () => {
			mockRunnableInnerFn.mockResolvedValue(finalStateFromGraph);
			const buildSpy = jest.spyOn(agent as any, 'buildGraphDefinition');
			const startNodeSpy = jest.spyOn(agent as any, 'getStartNodeId');

			await agent.run(
				initialInput,
				initialAgentStateData,
				mockGraphImplementation,
				graphConfig,
			);

			expect(buildSpy).toHaveBeenCalledTimes(1);
			expect(startNodeSpy).toHaveBeenCalledTimes(1);
		});

		it('should initialize run state correctly', () => {
			// Test the helper directly if made public for testing
			const initializedState = agent.testInitializeRunState(
				initialInput,
				initialAgentStateData,
			);

			expect(initializedState).toMatchObject({
				...expectedInitialStateBase,
				input: initialInput,
				agentState: initialAgentStateData,
			});
			expect(initializedState.agentRun.runId).toBeDefined();
			expect(initializedState.agentRun.startTime).toBeDefined();
			expect(initializedState.agentRun.outputDir).toEqual(mockAgentConfig.outputPath);
		});

		it('should call the graph implementation runnable with correct state and config', async () => {
			mockRunnableInnerFn.mockResolvedValue(finalStateFromGraph);

			await agent.run(
				initialInput,
				initialAgentStateData,
				mockGraphImplementation,
				graphConfig,
			);

			expect(mockGraphImplementation.runnable).toHaveBeenCalledTimes(1);
			expect(mockRunnableInnerFn).toHaveBeenCalledTimes(1);

			// Check the state passed to the runnable
			const actualInitialState = mockRunnableInnerFn.mock.calls[0][0];
			expect(actualInitialState).toMatchObject({
				...expectedInitialStateBase,
				input: initialInput,
				agentState: initialAgentStateData,
			});
			expect(actualInitialState.agentRun.runId).toBeDefined(); // Check dynamic parts exist

			// Check the config passed
			expect(mockRunnableInnerFn).toHaveBeenCalledWith(
				expect.any(Object), // Already checked state structure above
				graphConfig,
			);
		});

		it('should return the final state from the graph implementation on success', async () => {
			mockRunnableInnerFn.mockResolvedValue(finalStateFromGraph);

			const result = await agent.run(
				initialInput,
				initialAgentStateData,
				mockGraphImplementation,
				graphConfig,
			);

			expect(result).toEqual(finalStateFromGraph);
		});

		it('should handle errors from the graph implementation and return an error state', async () => {
			const graphError = new Error('Graph execution failed!');
			mockRunnableInnerFn.mockRejectedValue(graphError);

			const result = await agent.run(
				initialInput,
				initialAgentStateData,
				mockGraphImplementation,
				graphConfig,
			);

			expect(mockGraphImplementation.runnable).toHaveBeenCalledTimes(1);
			expect(mockRunnableInnerFn).toHaveBeenCalledTimes(1);

			// Check the resulting error state
			expect(result.status.overallStatus).toBe('error');
			expect(result.errors.errors).toContain(graphError.message);
			expect(result.errors.errorCount).toBeGreaterThan(0);
			// Check that input/agentState are preserved
			expect(result.input).toEqual(initialInput);
			expect(result.agentState).toEqual(initialAgentStateData);
			// Check that agentRun info is present
			expect(result.agentRun.runId).toBeDefined();
		});

		it('should create a valid error state object', () => {
			// Test the helper directly
			const baseState = agent.testInitializeRunState(initialInput, initialAgentStateData);
			const errorMessage = "Something broke";
			const errorState = agent.testCreateErrorState(baseState, errorMessage);

			expect(errorState.status.overallStatus).toBe('error');
			expect(errorState.errors.errors).toEqual([errorMessage]);
			expect(errorState.errors.errorCount).toBe(1);
			expect(errorState.agentRun).toBe(baseState.agentRun); // Should preserve run info
			expect(errorState.input).toBe(baseState.input);
			expect(errorState.agentState).toBe(baseState.agentState);
		});
	});
});
