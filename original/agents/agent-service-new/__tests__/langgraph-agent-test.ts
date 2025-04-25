// Assume this is defined alongside AgentGraph/LangGraphAgentGraph types
import type { AgentNode } from './AgentNode.js';
import type { AgentState } from './types.js';

// Reusing GraphNode structure
interface GraphNode<T extends AgentState<any, any, any>> {
	node: AgentNode<T>;
	next?: Array<string>; // Optional: For simple next steps
	// New field for conditional routing
	conditionalNext?: {
		sourceField: keyof T['agentState']; // Field in agentState to check
		// Maps field values to next node IDs
		routes: Record<string | number | symbol, string>;
		default?: string; // Optional default route if no match
	};
}

// Using the same GraphDefinition structure, but nodes can have conditionalNext
export interface LangGraphDefinition<T extends AgentState<any, any, any>> {
	[key: string]: GraphNode<T>;
}


// File: langGraphAgentGraph.test.ts

import type { RunnableConfig } from '@langchain/core/runnables'; // Type only
import type { StateGraph } from '@langchain/langgraph'; // Type only
import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentGraphConfig } from './AgentGraph.js'; // Shared config type
import { AgentNode } from './AgentNode.js';
// Import the specific types/classes for LangGraphAgentGraph
import {
	LangGraphAgentGraph,
	type LangGraphDefinition, // Use the definition that supports conditionalNext
} from './LangGraphAgentGraph.js'; // The class we will create
import type { AgentConfig, AgentState } from './types.js';

// --- Mock LangGraph Library ---
// Mock the entire module
vi.mock('@langchain/langgraph', () => {
	// Mock implementation of StateGraph
	const mockAddNode = vi.fn();
	const mockAddEdge = vi.fn();
	const mockAddConditionalEdges = vi.fn();
	const mockSetEntryPoint = vi.fn();
	const mockCompile = vi.fn();
	const mockInvoke = vi.fn(); // Mock for the compiled graph

	const MockStateGraph = vi.fn(() => ({
		addNode: mockAddNode,
		addEdge: mockAddEdge,
		addConditionalEdges: mockAddConditionalEdges,
		setEntryPoint: mockSetEntryPoint,
		compile: mockCompile,
	}));

	// Mock the result of compile()
	mockCompile.mockReturnValue({
		invoke: mockInvoke,
		// Add other methods like stream, batch if needed for future tests
	});

	return {
		StateGraph: MockStateGraph,
		// Export mock functions if needed for assertions directly
		_mockStateGraphInstance: {
			addNode: mockAddNode,
			addEdge: mockAddEdge,
			addConditionalEdges: mockAddConditionalEdges,
			setEntryPoint: mockSetEntryPoint,
			compile: mockCompile,
		},
		_mockCompiledGraph: {
			invoke: mockInvoke,
		}
	};
});

// --- Mock Dependencies ---

// Mock Services
const mockTaskService: ITaskService = { /* ... */ } as any;
const mockProviderService: IProviderService = { /* ... */ } as any;
const mockModelService: IModelService = { /* ... */ } as any;
const mockPromptService: IPromptService = { /* ... */ } as any;

// Mock AgentNode - Need a runnable() method for LangGraph
class MockAgentNodeLG extends AgentNode<any> {
	public executeFn: vi.Mock;
	public runnableFn: vi.Mock;

	constructor(executeFn?: vi.Mock) {
		super(mockTaskService, mockProviderService, mockModelService, mockPromptService);
		this.executeFn = executeFn || vi.fn(async (state) => state);
		// LangGraph needs a runnable. Let's make a simple one that calls execute.
		// In a real scenario, AgentNode might have a more complex runnable.
		this.runnableFn = vi.fn().mockImplementation(
			(state: any, config?: RunnableConfig) => this.execute(state, config as AgentGraphConfig)
		);
	}

	async execute(state: any, config?: AgentGraphConfig): Promise<any> {
		return this.executeFn(state, config);
	}

	// Provide the runnable method LangGraph expects
	runnable() {
		return this.runnableFn;
	}
}

// --- Test Setup ---
type TestState = AgentState<{ data: string }, { result: string }, { decision?: string; history: string[] }>;

const createInitialTestStateLG = (inputData = 'start', decision?: string): TestState => ({
	config: { name: 'TestConfigLG' } as AgentConfig,
	agentRun: { runId: 'lg-run-id', startTime: 't1', outputDir: '/out', inputDir: '/in', description: 'LG Test', completedSteps: [] },
	status: { overallStatus: 'running', nodeHistory: [], currentNode: undefined },
	logs: { logs: [], logCount: 0 },
	errors: { errors: [], errorCount: 0 },
	input: { data: inputData },
	output: { result: '' },
	agentState: { decision, history: [] }, // Include decision field for conditional tests
});

// --- Test Suite ---

describe('LangGraphAgentGraph', () => {
	let nodeAExecute: vi.Mock;
	let nodeBExecute: vi.Mock;
	let nodeCExecute: vi.Mock;
	let nodeA: MockAgentNodeLG;
	let nodeB: MockAgentNodeLG;
	let nodeC: MockAgentNodeLG;
	let mockLangGraphInternal: any; // To access mocked methods easily

	beforeEach(() => {
		vi.clearAllMocks(); // Clear Vitest mocks
		// Import the mocked methods for easier access in tests
		mockLangGraphInternal = await import('@langchain/langgraph');

		// Reset mocks on the imported objects
		mockLangGraphInternal._mockStateGraphInstance.addNode.mockClear();
		mockLangGraphInternal._mockStateGraphInstance.addEdge.mockClear();
		mockLangGraphInternal._mockStateGraphInstance.addConditionalEdges.mockClear();
		mockLangGraphInternal._mockStateGraphInstance.setEntryPoint.mockClear();
		mockLangGraphInternal._mockStateGraphInstance.compile.mockClear();
		mockLangGraphInternal._mockCompiledGraph.invoke.mockClear();


		nodeAExecute = vi.fn(async (state: TestState) => ({
			...state,
			agentState: { ...state.agentState, history: [...state.agentState.history, 'A'], decision: 'routeB' }, // Set decision
		}));
		nodeBExecute = vi.fn(async (state: TestState) => ({
			...state,
			agentState: { ...state.agentState, history: [...state.agentState.history, 'B'] },
			output: { result: 'Result from B' },
		}));
		nodeCExecute = vi.fn(async (state: TestState) => ({
			...state,
			agentState: { ...state.agentState, history: [...state.agentState.history, 'C'] },
			output: { result: 'Result from C' },
		}));

		nodeA = new MockAgentNodeLG(nodeAExecute);
		nodeB = new MockAgentNodeLG(nodeBExecute);
		nodeC = new MockAgentNodeLG(nodeCExecute);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should construct and create a StateGraph instance', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['END'] },
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
		// Check if the StateGraph constructor was called
		expect(mockLangGraphInternal.StateGraph).toHaveBeenCalledTimes(1);
		// Check the schema passed to StateGraph constructor (optional, depends on implementation)
		// expect(mockLangGraphInternal.StateGraph).toHaveBeenCalledWith({ channels: expect.any(Object) });
	});

	it('should add nodes to the StateGraph', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['nodeB'] },
			nodeB: { node: nodeB, next: ['END'] },
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);

		expect(mockLangGraphInternal._mockStateGraphInstance.addNode).toHaveBeenCalledTimes(2);
		// Check that the node's runnable() result is passed
		expect(mockLangGraphInternal._mockStateGraphInstance.addNode).toHaveBeenCalledWith('nodeA', nodeA.runnable());
		expect(mockLangGraphInternal._mockStateGraphInstance.addNode).toHaveBeenCalledWith('nodeB', nodeB.runnable());
	});

	it('should set the entry point', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['END'] },
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
		expect(mockLangGraphInternal._mockStateGraphInstance.setEntryPoint).toHaveBeenCalledWith('nodeA');
	});

	it('should add simple edges for `next` arrays', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['nodeB'] },
			nodeB: { node: nodeB, next: ['END'] }, // END edge is handled by LangGraph implicitly or via addEdge
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledTimes(2); // A->B and B->END
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledWith('nodeA', 'nodeB');
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledWith('nodeB', 'END');
	});

	it('should add conditional edges for `conditionalNext`', async () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: {
				node: nodeA,
				conditionalNext: {
					sourceField: 'decision', // Check agentState.decision
					routes: {
						routeB: 'nodeB',
						routeC: 'nodeC',
					},
					default: 'nodeC', // Optional default
				},
			},
			nodeB: { node: nodeB, next: ['END'] },
			nodeC: { node: nodeC, next: ['END'] },
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);

		expect(mockLangGraphInternal._mockStateGraphInstance.addConditionalEdges).toHaveBeenCalledTimes(1);
		expect(mockLangGraphInternal._mockStateGraphInstance.addConditionalEdges).toHaveBeenCalledWith(
			'nodeA', // Source node
			expect.any(Function), // The state inspection function
			{ routeB: 'nodeB', routeC: 'nodeC', default: 'nodeC' } // Route mapping including default
		);

		// Test the generated conditional function (optional but good)
		const conditionalFunc = mockLangGraphInternal._mockStateGraphInstance.addConditionalEdges.mock.calls[0][1];
		const stateRouteB = createInitialTestStateLG('test', 'routeB');
		const stateRouteC = createInitialTestStateLG('test', 'routeC');
		const stateRouteDefault = createInitialTestStateLG('test', 'other');
		expect(await conditionalFunc(stateRouteB)).toBe('routeB');
		expect(await conditionalFunc(stateRouteC)).toBe('routeC');
		expect(await conditionalFunc(stateRouteDefault)).toBe('nodeC'); // Check default route

		// Check that edges for B and C to END are also added
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledTimes(2);
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledWith('nodeB', 'END');
		expect(mockLangGraphInternal._mockStateGraphInstance.addEdge).toHaveBeenCalledWith('nodeC', 'END');
	});

	it('should compile the graph', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['END'] },
		};
		new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
		expect(mockLangGraphInternal._mockStateGraphInstance.compile).toHaveBeenCalledTimes(1);
	});

	describe('runnable() Execution', () => {
		const graphDefinition: LangGraphDefinition<TestState> = {
			nodeA: { node: nodeA, next: ['END'] },
		};
		const initialState = createInitialTestStateLG();
		const graphConfig: AgentGraphConfig = { debug: true, timeout: 5000, tags: ['test-tag'] };
		const expectedRunnableConfig: RunnableConfig = {
			configurable: { ...graphConfig },
			// Potentially add recursionLimit or other LangGraph specifics if needed
		};
		const finalStateFromLangGraph = { ...initialState, output: { result: 'Final Result' } };

		it('should return a function that invokes the compiled graph', async () => {
			const agentGraph = new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			mockLangGraphInternal._mockCompiledGraph.invoke.mockResolvedValue(finalStateFromLangGraph);

			const runnableFunc = agentGraph.runnable();
			const result = await runnableFunc(initialState, graphConfig);

			expect(mockLangGraphInternal._mockCompiledGraph.invoke).toHaveBeenCalledTimes(1);
			expect(mockLangGraphInternal._mockCompiledGraph.invoke).toHaveBeenCalledWith(
				initialState,
				expect.objectContaining({ configurable: graphConfig }) // Check config conversion
			);
			expect(result).toEqual(finalStateFromLangGraph);
		});

		it('should convert AgentGraphConfig to RunnableConfig correctly', async () => {
			const agentGraph = new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			mockLangGraphInternal._mockCompiledGraph.invoke.mockResolvedValue(finalStateFromLangGraph);

			const runnableFunc = agentGraph.runnable();
			await runnableFunc(initialState, graphConfig);

			expect(mockLangGraphInternal._mockCompiledGraph.invoke).toHaveBeenCalledWith(
				initialState,
				expectedRunnableConfig // Check the exact expected RunnableConfig structure
			);
		});

		it('should handle errors from the compiled graph invoke', async () => {
			const graphDefinition: LangGraphDefinition<TestState> = { nodeA: { node: nodeA, next: ['END'] } };
			const agentGraph = new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			const invokeError = new Error('LangGraph Invoke Failed');
			mockLangGraphInternal._mockCompiledGraph.invoke.mockRejectedValue(invokeError);

			const runnableFunc = agentGraph.runnable();

			// The error should propagate up
			await expect(runnableFunc(initialState, graphConfig)).rejects.toThrow(invokeError);
		});
	});

	describe('setDebug', () => {
		it('should set the internal debug flag (minimal test)', () => {
			const graphDefinition: LangGraphDefinition<TestState> = { nodeA: { node: nodeA, next: ['END'] } };
			const agentGraph = new LangGraphAgentGraph(graphDefinition, 'nodeA', mockTaskService, mockProviderService, mockModelService, mockPromptService);
			// We can't easily test LangSmith integration here, so just check the flag
			agentGraph.setDebug(true);
			expect((agentGraph as any).debug).toBe(true);
			agentGraph.setDebug(false);
			expect((agentGraph as any).debug).toBe(false);
			// We could also test if the debug flag influences the RunnableConfig passed to invoke
		});
	});

});
