import type { RunnableConfig } from "@langchain/core/runnables";
import { END, START, StateGraph } from "@langchain/langgraph";
import { randomUUID } from 'crypto';
import { join } from 'path';
import { ConfigurationLoader } from '../../shared/services/configuration/index.js';
import { ModelConfigurationService } from '../../shared/services/model/modelConfigurationService.js';
import { PromptConfigurationService } from '../../shared/services/prompt/promptConfigurationService.js';
import { ProviderConfigurationService } from '../../shared/services/provider/providerConfigurationService.js';
import { TaskConfigurationService } from '../../shared/services/task/taskConfigurationService.js';
import { createInitialState, type ClusteringState } from "./state.js";
import type { AgentConfig, ChannelReducer, RunConfig } from './types';

import {
    clusterPersonasNode,
    elaboratePersonasNode,
    initializeRunNode,
    loadProfilesNode,
    saveResultsNode
} from "./nodes/index.js";

// Define type for node functions
export type ClusteringNodeFunction = (
    state: ClusteringState,
    config?: RunnableConfig
) => Promise<Partial<ClusteringState>>;

// Define the channels interface
interface ClusteringStateChannels {
    readonly config: ChannelReducer<ClusteringState['config']>;
    readonly runInfo: ChannelReducer<ClusteringState['runInfo']>;
    readonly normalizedProfiles: ChannelReducer<ClusteringState['normalizedProfiles']>;
    readonly basicClusters: ChannelReducer<ClusteringState['basicClusters']>;
    readonly currentClusterIndex: ChannelReducer<ClusteringState['currentClusterIndex']>;
    readonly inputPersona: ChannelReducer<ClusteringState['inputPersona']>;
    readonly elaboratedPersonas: ChannelReducer<ClusteringState['elaboratedPersonas']>;
    readonly error: ChannelReducer<ClusteringState['error']>;
    readonly status: ChannelReducer<ClusteringState['status']>;
    readonly completedSteps: ChannelReducer<ClusteringState['completedSteps']>;
    readonly logs: ChannelReducer<ClusteringState['logs']>;
    readonly recommendations: ChannelReducer<ClusteringState['recommendations']>;
    readonly errorCount: ChannelReducer<ClusteringState['errorCount']>;
}

export class ClusteringAgent {
    private readonly debug: boolean = true;
    private readonly configLoader: ConfigurationLoader;
    private config: AgentConfig;
    private readonly graph: ReturnType<typeof this.createGraph>;
    private readonly runInfo: RunConfig;
    private readonly taskConfig: TaskConfigurationService;
    private readonly promptConfig: PromptConfigurationService;
    private readonly modelConfig: ModelConfigurationService;
    private readonly providerConfig: ProviderConfigurationService;

    constructor({ rootPath }: { rootPath: string }) {
        if (this.debug) {
            console.info("[ ClusteringAgent ] Root path: ", rootPath);
        }
        this.configLoader = new ConfigurationLoader({
            basePath: join(rootPath, 'config'),
            environment: process.env.NODE_ENV,
            validateSchema: true
        });

        // Initialize configuration services
        this.taskConfig = new TaskConfigurationService({
            configPath: join(rootPath, 'config'),
            environment: process.env.NODE_ENV
        });
        this.promptConfig = new PromptConfigurationService(join(rootPath, 'config'));
        this.modelConfig = new ModelConfigurationService({
            configPath: join(rootPath, 'config'),
            environment: process.env.NODE_ENV
        });
        this.providerConfig = new ProviderConfigurationService({
            configPath: join(rootPath, 'config'),
            environment: process.env.NODE_ENV
        });

        // Initialize runInfo
        this.runInfo = {
            runId: randomUUID(),
            startTime: new Date().toISOString(),
            outputDir: join(rootPath, "output"),
            inputDir: join(rootPath, "data", "normalized")
        };

        // Initialize graph with temporary config
        this.graph = this.createGraph({} as AgentConfig);
        if (this.debug) console.info("[ ClusteringAgent ] Graph created");
    }

    async initialize(): Promise<void> {
        // Load config
        const loadedConfig = await this.configLoader.loadConfig('config.json');
        this.config = loadedConfig as AgentConfig;
    }

    private createGraph(config: AgentConfig) {
        // Define the channels with their reducers
        const channels: ClusteringStateChannels = {
            config: { reducer: (a, b) => ({ ...a, ...b }) },
            runInfo: { reducer: (a, b) => ({ ...a, ...b }) },
            normalizedProfiles: { reducer: (a, b) => [...(a || []), ...(b || [])] },
            basicClusters: { reducer: (_, b) => b },
            currentClusterIndex: { reducer: (_, b) => b },
            inputPersona: { reducer: (_, b) => b },
            elaboratedPersonas: { reducer: (a, b) => [...(a || []), ...(b || [])] },
            error: { reducer: (_, b) => b },
            status: { reducer: (_, b) => b },
            completedSteps: { reducer: (a, b) => [...(a || []), ...(b || [])] },
            logs: { reducer: (a, b) => [...(a || []), ...(b || [])] },
            recommendations: { reducer: (a, b) => [...(a || []), ...(b || [])] },
            errorCount: { reducer: (a, b) => (a || 0) + (b || 0) }
        };

        const graph = new StateGraph<ClusteringState>({ channels })
            .addNode('initialize_run', initializeRunNode)
            .addEdge(START, 'initialize_run')
            .addNode('load_profiles', loadProfilesNode)
            .addEdge('initialize_run', 'load_profiles')
            .addNode('cluster_personas', clusterPersonasNode)
            .addEdge('load_profiles', 'cluster_personas')
            .addNode('elaborate_personas', elaboratePersonasNode)
            .addEdge('cluster_personas', 'elaborate_personas')
            .addNode('save_results', saveResultsNode)
            .addEdge('elaborate_personas', 'save_results')
            .addEdge('save_results', END);

        return graph.compile();
    }

    async run() {
        await this.initialize();
        const initialState = createInitialState(
            this.runInfo.runId,
            this.runInfo.outputDir,
            this.runInfo.inputDir,
            this.config
        );
        try {
            const result = await this.graph.invoke(initialState);
            return result;
        } catch (error) {
            console.error('Error executing graph:', error);
            throw error;
        }
    }
}