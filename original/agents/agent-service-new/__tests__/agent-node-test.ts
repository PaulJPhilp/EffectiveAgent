// File: agentNode.test.ts

import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentGraphConfig } from './AgentGraph.js';
import { AgentNode } from './AgentNode.js'; // The abstract class
import type { AgentConfig, AgentState } from './types.js';

// --- Mock Dependencies ---

// Mock Services using Vitest
const mockTaskService: ITaskService = {
	getTaskConfig: vi.fn(),
	executeTask: vi.fn(),
};

const mockProviderService: IProviderService = {
	getProvider: vi.fn(),
	listModels: vi.fn(),
};

const mockModelService: IModelService = {
	getModelConfig: vi.fn(),
	getModelInstance: vi.fn(),
};

const mockPromptService: IPromptService = {
	getPrompt: vi.fn(),
	renderPrompt: vi.fn(),
};

// --- Concrete Test Node Implementation ---

// Define simple State for testing
type TestState = AgentState<{ data: string }, { result: string }, { history: string[] }>;

class TestNode extends AgentNode<TestState> {
	// Expose protected debug flag for testing
	public getDebugFlag(): boolean {
		return this.debug;
	}

	// Implement the abstract execute method for testing
	async execute(state: TestState, config?: AgentGraphConfig): Promise<TestState> {
		if (this.debug) {
			console.log(`TestNode executing with debug enabled. Config: ${JSON.stringify(config)}`);
		}

		// Example: Use injected services
		const prompt = await this.promptService.getPrompt('testPrompt');
		const taskResult = await this.taskService.executeTask('testTask', state.input);

		// Example: Modify state
		const newHistory = [...state.agentState.history, `Executed with prompt: ${prompt}`];
		const newOutput = { result: `Task output: ${taskResult} (Input: ${state.input.data})` };

		// Return the new state
		return {
			...state,
			output: newOutput,
			agentState: { history: newHistory },
			// Note: The node itself doesn't update logs/errors/status in this refactored model
			// Those are handled by the AgentGraph runner
		};
	}
}

// --- Test Suite ---

describe('AgentNode', () => {
	let node: TestNode;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		vi.spyOn(console, 'log').mockImplementation(() => { }); // Suppress console logs

		// Create a new node instance for each test
		node = new TestNode(
			mockTaskService,
			mockProviderService,
			mockModelService,
			mockPromptService,
		);
	});

	it('should construct successfully with injected dependencies', () => {
		expect(node).toBeInstanceOf(TestNode);
		// Check if services are assigned (accessing protected for test)
		expect((node as any).taskService).toBe(mockTaskService);
		expect((node as any).providerService).toBe(mockProviderService);
		expect((node as any).modelService).toBe(mockModelService);
		expect((node as any).promptService).toBe(mockPromptService);
	});

	describe('execute', () => {
		const initialState: TestState = {
			config: { name: 'TestConfig' } as AgentConfig,
			agentRun: { runId: 'run1', startTime: 't1', outputDir: '/out', inputDir: '/in', description: 'Test', completedSteps: [] },
			status: { overallStatus: 'running', nodeHistory: [], currentNode: 'TestNode' },
			logs: { logs: [], logCount: 0 },
			errors: { errors: [], errorCount: 0 },
			input: { data: 'initial input' },
			output: { result: '' },
			agentState: { history: [] },
		};
		const testConfig: AgentGraphConfig = { timeout: 10000 };

		it('should receive the correct state and config', async () => {
			const executeSpy = vi.spyOn(node, 'execute');
			await node.execute(initialState, testConfig);
			expect(executeSpy).toHaveBeenCalledWith(initialState, testConfig);
		});

		it('should use injected services', async () => {
			// Setup mock service return values
			vi.mocked(mockPromptService.getPrompt).mockResolvedValue('Mocked Prompt Content');
			vi.mocked(mockTaskService.executeTask).mockResolvedValue('Mocked Task Result');

			await node.execute(initialState, testConfig);

			// Verify services were called correctly
			expect(mockPromptService.getPrompt).toHaveBeenCalledWith('testPrompt');
			expect(mockTaskService.executeTask).toHaveBeenCalledWith('testTask', initialState.input);
		});

		it('should return the transformed state', async () => {
			// Setup mock service return values
			vi.mocked(mockPromptService.getPrompt).mockResolvedValue('Prompt A');
			vi.mocked(mockTaskService.executeTask).mockResolvedValue('Result B');

			const finalState = await node.execute(initialState, testConfig);

			// Check specific transformations
			expect(finalState.output.result).toBe('Task output: Result B (Input: initial input)');
			expect(finalState.agentState.history).toEqual(['Executed with prompt: Prompt A']);

			// Check that other parts of the state are preserved (important!)
			expect(finalState.config).toBe(initialState.config);
			expect(finalState.agentRun).toBe(initialState.agentRun);
			expect(finalState.status).toBe(initialState.status);
			expect(finalState.logs).toBe(initialState.logs); // Node doesn't modify logs directly
			expect(finalState.errors).toBe(initialState.errors); // Node doesn't modify errors directly
			expect(finalState.input).toBe(initialState.input);
		});

		it('should propagate errors from service calls', async () => {
			const serviceError = new Error('Task Service Failed');
			vi.mocked(mockTaskService.executeTask).mockRejectedValue(serviceError);

			// Expect the execute method to throw the error (runner will catch it)
			await expect(node.execute(initialState, 
