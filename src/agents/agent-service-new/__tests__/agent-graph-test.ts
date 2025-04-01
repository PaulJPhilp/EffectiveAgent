// File: agentGraph.test.ts

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
} from './types.js';
import type { AgentGraphConfig, GraphDefinition } from './AgentGraph.js';
import { AgentGraph } from './AgentGraph.js'; // The class we will create
import { AgentNode } from './AgentNode.js'; // Need the base type

// --- Mock Dependencies ---

// Mock Services (basic mocks, AgentGraph primarily passes them)
const mockTaskService: jest.Mocked<ITaskService> = { /* ...mock methods if needed */ } as any;
const mockProviderService: jest.Mocked<IProviderService> = { /* ... */ } as any;
const mockModelService: jest.Mocked<IModelService> = { /* ... */ } as any;
const mockPromptService: jest.Mocked<IPromptService> = { /* ... */ } as any;

// Mock AgentNode
// We need a way to create mock nodes with specific execute behavior
class MockAgentNode extends AgentNode<any> {
	public executeFn: jest.Mock;

	constructor(executeFn?: jest.Mock) {
		// Pass mock services to super - they shouldn't be used by mock execute
		super(mockTaskService, mockProviderService, mockModelService, mockPromptService);
		this.executeFn = executeFn || jest.fn(async (state) => state); // Default: return state unchanged
	}

	// Override execute to use the mock function
	async execute(state: any, config?: AgentGraphConfig): Promise<any> {
		return this.executeFn(state, config);
	}
}

// --- Test Setup ---

// Define simple State for testing
type TestState = AgentState<{ data: string }, { result: string }, { history: string[] }>;

const createInitialTestState = (inputData = 'start'): TestState => ({
	config: { name: 'TestConfig' } as AgentConfig, // Simplified mock config
	agentRun: {
		runId: 'test-run-id',
		startTime: new Date().toISOString(),
		outputDir: '/out',
		inputDir: '/in',
		description: 'Test Run',
		completedSteps: [],
	},
	status: { overallStatus: 'running', nodeHistory: [], currentNode: undefined },
	logs: { logs: [], logCount: 0 },
	errors: { errors: [], errorCount: 0 },
	input: { data: inputData },
	output: { result: '' },
	agentState: { history: [] },
});

// --- Test Suite ---

describe('AgentGraph (Default Implementation)', () => {
	let nodeAExecute: jest.Mock;
	let nodeBExecute: jest.Mock;
	let nodeCExecute: jest.Mock;
	let nodeA: MockAgentNode;
	let nodeB: MockAgentNode;
	let nodeC: MockAgentNode; // For unreachable test

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'log').mockImplementation(() => { }); // Suppress debug logs unless tested
		jest.spyOn(console, 'error').mockImplementation(() => { }); // Suppress error logs

		// Define mock execute functions for nodes
		nodeAExecute = jest.fn(async (state: TestState) => ({
			...state,
			agentState: { history: [...state.agentState.history, 'A executed'] },
			logs: { ...state.logs, logs: [...state.logs.logs, 'Node A log'], logCount: state.logs.logCount + 1 },
		}));
		nodeBExecute = jest.fn(async (state: TestState, config?: AgentGraphConfig) => ({
			...state,
			agentState: { history: [...state.agentState.history, 'B executed'] },
			output: { result: `Result from B (config debug: ${config?.debug})` },
			logs: { ...state.logs, logs: [...state.logs.logs, 'Node B log'], logCount: state.logs.logCount + 1 },
		}));
		nodeCExecute = jest.fn(async (state: TestState) => ({
			...state, // Unreachable node
			agentState: { history: [...state.agentState.history, 'C executed'] },
		}));

		nodeA = new MockAgentNode(nodeAExecute);
		nodeB = new MockAgentNode(nodeBExecute);
		nodeC = new MockAgentNode(nodeCExecute);
	});

	afterEach(() => {
		jest.restoreAllMocks(); // Restore console spies
	});

	describe('Constructor & Validation', () => {
		it('should construct successfully with a valid graph', () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['nodeB'] },
				nodeB: { node: nodeB, next: ['END'] },
			};
			expect(
				() =>
					new AgentGraph(
						graphDefinition,
						'nodeA',
						mockTaskService,
						mockProviderService,
						mockModelService,
						mockPromptService,
					),
			).not.toThrow();
		});

		it('should throw error if start node is not in graph', () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeB: { node: nodeB, next: ['END'] },
			};
			expect(
				() =>
					new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService),
			).toThrow('Start node "nodeA" not found in graph');
		});

		it('should throw error if a node references an undefined next node', () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['nodeX'] }, // nodeX is not defined
			};
			expect(
				() =>
					new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService),
			).toThrow('Node "nodeX" referenced by "nodeA" but not defined in graph');
		});

		it('should throw error if a node is unreachable from the start node', () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['END'] },
				nodeB: { node: nodeB, next: ['END'] }, // nodeB is unreachable
			};
			expect(
				() =>
					new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService),
			).toThrow('Node "nodeB" is unreachable from start node "nodeA"');
		});
	});

	describe('runnable() Execution', () => {
		it('should execute nodes sequentially and return final state', async () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['nodeB'] },
				nodeB: { node: nodeB, next: ['END'] },
			};
			const agentGraph = new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			const initialState = createInitialTestState();
			const config: AgentGraphConfig = { debug: false };

			const finalState = await agentGraph.runnable()(initialState, config);

			// Check node execution order and calls
			expect(nodeAExecute).toHaveBeenCalledTimes(1);
			expect(nodeBExecute).toHaveBeenCalledTimes(1);
			expect(nodeAExecute).toHaveBeenCalledBefore(nodeBExecute); // Requires jest-extended or manual order check

			// Check state passed between nodes
			const statePassedToB = nodeBExecute.mock.calls[0][0];
			expect(statePassedToB.agentState.history).toEqual(['A executed']);
			expect(statePassedToB.logs.logs).toContain('Node A log');

			// Check config passed to nodes
			expect(nodeAExecute).toHaveBeenCalledWith(expect.anything(), config);
			expect(nodeBExecute).toHaveBeenCalledWith(expect.anything(), config);

			// Check final state
			expect(finalState.status.overallStatus).toBe('completed');
			expect(finalState.output.result).toBe('Result from B (config debug: false)');
			expect(finalState.agentState.history).toEqual(['A executed', 'B executed']);
			expect(finalState.agentRun.completedSteps).toEqual(['nodeA', 'nodeB']);
			expect(finalState.status.nodeHistory).toHaveLength(2);
			expect(finalState.status.nodeHistory[0]).toMatchObject({ nodeId: 'nodeA', status: 'completed' });
			expect(finalState.status.nodeHistory[1]).toMatchObject({ nodeId: 'nodeB', status: 'completed' });
			expect(finalState.logs.logs).toEqual(expect.arrayContaining(['Starting graph execution', 'Entering node nodeA', 'Node A log', 'Exiting node nodeA', 'Entering node nodeB', 'Node B log', 'Exiting node nodeB', 'Graph execution finished']));
			expect(finalState.errors.errorCount).toBe(0);
		});

		it('should stop execution if a node returns an error', async () => {
			const error = new Error('Node B failed!');
			nodeBExecute.mockRejectedValue(error); // Make node B fail

			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['nodeB'] },
				nodeB: { node: nodeB, next: ['END'] },
			};
			const agentGraph = new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			const initialState = createInitialTestState();

			const finalState = await agentGraph.runnable()(initialState);

			expect(nodeAExecute).toHaveBeenCalledTimes(1);
			expect(nodeBExecute).toHaveBeenCalledTimes(1);

			expect(finalState.status.overallStatus).toBe('error');
			expect(finalState.errors.errors).toContain('Error executing node nodeB: Node B failed!');
			expect(finalState.errors.errorCount).toBe(1);
			expect(finalState.agentRun.completedSteps).toEqual(['nodeA']); // Only A completed
			expect(finalState.status.nodeHistory).toHaveLength(2);
			expect(finalState.status.nodeHistory[0]).toMatchObject({ nodeId: 'nodeA', status: 'completed' });
			expect(finalState.status.nodeHistory[1]).toMatchObject({ nodeId: 'nodeB', status: 'error', error: 'Node B failed!' });
			// Check that state before error is preserved where appropriate
			expect(finalState.agentState.history).toEqual(['A executed']);
			expect(finalState.output.result).toBe(''); // Output from B was not set
		});

		it('should handle graphs that finish immediately (start -> END)', async () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['END'] },
			};
			const agentGraph = new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			const initialState = createInitialTestState();

			const finalState = await agentGraph.runnable()(initialState);

			expect(nodeAExecute).toHaveBeenCalledTimes(1);
			expect(nodeBExecute).not.toHaveBeenCalled();

			expect(finalState.status.overallStatus).toBe('completed');
			expect(finalState.agentRun.completedSteps).toEqual(['nodeA']);
			expect(finalState.status.nodeHistory).toHaveLength(1);
			expect(finalState.status.nodeHistory[0]).toMatchObject({ nodeId: 'nodeA', status: 'completed' });
			expect(finalState.agentState.history).toEqual(['A executed']);
		});

		it('should enable debug logging via setDebug', async () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['END'] },
			};
			const agentGraph = new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			agentGraph.setDebug(true); // Enable debug
			const initialState = createInitialTestState();
			const consoleLogSpy = jest.spyOn(console, 'log');

			await agentGraph.runnable()(initialState);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[AgentGraph] Starting graph execution'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[AgentGraph] Entering node nodeA'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[AgentGraph] Exiting node nodeA'));
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[AgentGraph] Graph execution finished'));
		});

		it('should enable debug logging via config', async () => {
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['END'] },
			};
			const agentGraph = new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			// agentGraph.setDebug(false); // Ensure instance debug is off
			const initialState = createInitialTestState();
			const config: AgentGraphConfig = { debug: true }; // Enable via config
			const consoleLogSpy = jest.spyOn(console, 'log');

			await agentGraph.runnable()(initialState, config);

			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[AgentGraph] Starting graph execution'));
			// ... other debug log checks
		});

		it('should handle errors during graph validation in constructor', () => {
			// Re-test validation errors to ensure they originate from constructor
			const graphDefinition: GraphDefinition<TestState> = {
				nodeA: { node: nodeA, next: ['nodeX'] }, // nodeX is not defined
			};
			expect(
				() => new AgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService),
			).toThrow('Node "nodeX" referenced by "nodeA" but not defined in graph');
		});
	});
});
