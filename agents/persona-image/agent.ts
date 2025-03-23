import { END, START, StateGraph, type StateGraphArgs } from '@langchain/langgraph';
import type { ImageState } from './state';
import { createInitialState } from './state';

import {
	initializeRunNode,
	loadProfilesNode,
	generateImageNode,
	saveResultsNode,
} from './nodes';

import { type ChannelReducer } from '../types';
import { ConfigLoader, type BaseAgentConfig } from '../config';

interface ImageStateChannels {
	readonly runInfo: ChannelReducer<ImageState['runInfo']>;
	readonly status: ChannelReducer<ImageState['status']>;
	readonly normalizedProfiles: ChannelReducer<ImageState['normalizedProfiles']>;
	readonly images: ChannelReducer<ImageState['images']>;
	readonly imageResults: ChannelReducer<ImageState['imageResults']>;
	readonly summary: ChannelReducer<ImageState['summary']>;
}
/**
 * Represents a normalizing agent that processes and structures profile data
 */
export class ImageAgent {
	private readonly graph: ReturnType<typeof this.createGraph>;
	private readonly config: BaseAgentConfig;
	private readonly configLoader: ConfigLoader;

	constructor({ configPath }: { configPath: string }) {
		this.configLoader = new ConfigLoader(configPath);
		this.config = this.configLoader.loadAgentConfig();
		this.graph = this.createGraph();
	}

	/**
	 * Creates and configures the normalization graph
	 * @returns Compiled state graph
	 */
	private createGraph() {
		const initialState = createInitialState();
		const channels: ImageStateChannels = {
			runInfo: { reducer: (a, b) => ({ ...a, ...b }) },
			status: { reducer: (a, b) => b },
			normalizedProfiles: { reducer: (a, b) => [...a, ...b] },
			images: { reducer: (a, b) => [...a, ...b] },
			imageResults: { reducer: (a, b) => [...a, ...b] },
			summary: { reducer: (a, b) => ({ ...a, ...b }) },
		};
		const graph = new StateGraph<ImageState>({ channels })
			.addNode('initialize_run', initializeRunNode)
			.addEdge(START, 'initialize_run')
			.addNode('load_profiles', loadProfilesNode)
			.addEdge('initialize_run', 'load_profiles')
			.addNode('generate_images', generateImageNode)
			.addEdge('load_profiles', 'generate_images')
			.addNode('save_results', saveResultsNode)
			.addEdge('generate_images', 'save_results')
			.addEdge('save_results', END);

		return graph.compile();
	}

	/**
	 * Runs the normalization process
	 * @param inputDir Directory containing PDF files to process
	 * @param outputDir Output directory for normalized profiles
	 * @returns Final state after normalization
	 */
	public async run(
		inputDir: string,
		outputDir: string
	): Promise<ImageState> {
		try {
			const initialState = createInitialState(undefined, outputDir, inputDir);
			const result = await this.graph.invoke(initialState);

			return {
				...initialState,
				...result,
			} as ImageState;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Normalization failed: ${errorMessage}`);
		}
	}
}