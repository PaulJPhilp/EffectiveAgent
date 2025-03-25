#!/usr/bin/env bun

import fs from 'node:fs/promises';
import path from 'node:path';

interface AgentTemplate {
    readonly name: string;
    readonly description: string;
}

const createDirectoryStructure = async (agentPath: string): Promise<void> => {
    const directories = [
        '',
        'config',
        'config/prompts',
        'nodes',
        '__tests__'
    ];

    for (const dir of directories) {
        await fs.mkdir(path.join(agentPath, dir), { recursive: true });
    }
};

const createConfigFiles = async (
    agentPath: string,
    template: AgentTemplate
): Promise<void> => {
    // Agent-specific configuration
    const configContent = {
        name: template.name,
        description: template.description,
        version: '0.1.0',
        rootPath: process.cwd(),
        agentPath: agentPath,
        inputPath: path.join(agentPath, 'input'),
        outputPath: path.join(agentPath, 'output'),
        logPath: path.join(agentPath, 'logs'),
        maxConcurrency: 1,
        maxRetries: 3,
        retryDelay: 1000,
        configFiles: {
            tasks: path.join(agentPath, 'config', 'tasks.json'),
            models: path.join(agentPath, 'config', 'models.json'),
            providers: path.join(agentPath, 'config', 'providers.json')
        },
        tasksConfigPath: path.join(agentPath, 'config', 'tasks.json'),
        taskType: 'test-agent-v3',
        tasks: [
            {
                name: 'initialize',
                taskName: 'initialize',
                primaryModelId: 'text-default',
                fallbackModelIds: [],
                temperature: 0,
                requiredCapabilities: ['text-generation'],
                maxTokens: 1000,
                description: 'Initialize agent run',
                type: 'system'
            },
            {
                name: 'process',
                taskName: 'process',
                primaryModelId: 'text-default',
                fallbackModelIds: [],
                temperature: 0.7,
                requiredCapabilities: ['text-generation'],
                maxTokens: 2000,
                description: 'Process input',
                type: 'llm'
            },
            {
                name: 'complete',
                taskName: 'complete',
                primaryModelId: 'text-default',
                fallbackModelIds: [],
                temperature: 0,
                requiredCapabilities: ['text-generation'],
                maxTokens: 1000,
                description: 'Complete agent run',
                type: 'system'
            }
        ]
    };

    // Create config directory and subdirectories
    await fs.mkdir(path.join(agentPath, 'config'), { recursive: true });
    await fs.mkdir(path.join(agentPath, 'config', 'prompts'), { recursive: true });

    // Write configuration files
    const writeConfig = async (name: string, content: unknown): Promise<void> => {
        await fs.writeFile(
            path.join(agentPath, 'config', `${name}.json`),
            JSON.stringify(content, null, 2)
        );
    };

    await writeConfig('config', configContent);
};

const createTypeFile = async (agentPath: string): Promise<void> => {
    const content = `import type { RunConfig } from '../types';

/**
 * Agent status type
 */
export type AgentStatus =
    | 'initializing'
    | 'processing'
    | 'completing'
    | 'completed'
    | 'error';

/**
 * Agent state interface
 */
export interface State {
    readonly runInfo: RunConfig;
    readonly status: AgentStatus;
    readonly input: string;
    readonly output: string;
    readonly error?: Error;
}`;
    await fs.writeFile(path.join(agentPath, 'types.ts'), content);
};

const createStateFile = async (agentPath: string): Promise<void> => {
    const content = `import type { State } from './types';
import crypto from 'crypto';

/**
 * Creates initial agent state
 * @returns Initial state for agent run
 */
export function createInitialState(): State {
    const runId = generateRunId();
    
    return {
        runInfo: {
            runId,
            startTime: new Date().toISOString(),
            outputDir: '',
            inputDir: ''
        },
        status: 'initializing',
        input: '',
        output: '',
        error: undefined
    };
}

/**
 * Generates a unique run ID using timestamp and random chars
 * @returns Unique run identifier
 */
function generateRunId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomChars = crypto.randomBytes(4).toString('hex');
    return \`run-\${timestamp}-\${randomChars}\`;
}`;
    await fs.writeFile(path.join(agentPath, 'state.ts'), content);
};

const createAgentFile = async (agentPath: string): Promise<void> => {
    const content = `import { END, START, StateGraph } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { State } from './types';
import { createInitialState } from './state';
import { TaskRegistryService } from '@shared/services/task/taskRegistryService';
import { type ChannelReducer } from '../types';
import { initializeNode } from './nodes/initialize';
import { processNode } from './nodes/process';
import { completeNode } from './nodes/complete';

interface AgentStateChannels {
    readonly runInfo: ChannelReducer<State['runInfo']>;
    readonly status: ChannelReducer<State['status']>;
    readonly input: ChannelReducer<State['input']>;
    readonly output: ChannelReducer<State['output']>;
    readonly error: ChannelReducer<State['error']>;
}

interface AgentConfig {
    readonly configPath: string;
    readonly tasksConfigPath: string;
    readonly taskType: string;
}

/**
 * Agent implementation using LangGraph
 */
export class Agent {
    private readonly graph: ReturnType<typeof this.createGraph>;
    private readonly taskRegistry: TaskRegistryService;

    constructor(config: AgentConfig) {
        this.taskRegistry = new TaskRegistryService(config);
        this.graph = this.createGraph();
    }

    private createGraph() {
        const channels: AgentStateChannels = {
            runInfo: { reducer: (a, b) => ({ ...a, ...b }) },
            status: { reducer: (_, b) => b },
            input: { reducer: (_, b) => b },
            output: { reducer: (_, b) => b },
            error: { reducer: (_, b) => b }
        };

        const graph = new StateGraph<State>({ channels })
            .addNode('initialize', initializeNode)
            .addNode('process', processNode)
            .addNode('complete', completeNode)
            .addEdge('initialize', 'process')
            .addEdge('process', 'complete')
            .addEdge(START, 'initialize')
            .addEdge('complete', END);

        return graph.compile();
    }

    /**
     * Invokes the agent with input
     */
    async invoke(
        input: string,
        config?: RunnableConfig
    ): Promise<State> {
        try {
            const initialState = createInitialState();
            const state: State = {
                ...initialState,
                input,
                status: 'initializing'
            };
            const result = await this.graph.invoke(state, config);
            return {
                ...initialState,
                ...result
            } as State;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(\`Agent execution failed: \${errorMessage}\`);
        }
    }
}`;
    await fs.writeFile(path.join(agentPath, 'agent.ts'), content);
};

const createNodeFiles = async (agentPath: string): Promise<void> => {
    const nodes = {
        initialize: `import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * Node handler for initializing an agent run
 * @param state Current agent state
 * @returns Updated state with initialization complete
 */
export const initializeNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    // Set up run directories
    const outputDir = setupRunDirectories(state.runInfo.runId);

    return {
        ...state,
        status: 'processing',
        runInfo: {
            ...state.runInfo,
            outputDir
        }
    };
};

/**
 * Helper function for setting up run directories
 * @param runId Unique run identifier
 * @returns Path to output directory
 */
function setupRunDirectories(runId: string): string {
    const baseDir = path.join(process.cwd(), 'data', 'test-agent-v3', 'runs', runId);

    // Create main run directory
    fs.mkdirSync(baseDir, { recursive: true });

    // Create subdirectories for different outputs
    const dirs = ['output', 'logs', 'errors'];
    for (const dir of dirs) {
        fs.mkdirSync(path.join(baseDir, dir), { recursive: true });
    }

    return baseDir;
}`,
        process: `import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import path from 'path';
import fs from 'fs';

/**
 * Node handler for processing input
 * @param state Current agent state
 * @returns Updated state with processing complete
 */
export const processNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    // Process input and save output
    const output = \`Processed: \${state.input}\`;
    await saveOutput(state.runInfo.runId, output);

    return {
        ...state,
        status: 'completing',
        output
    };
};

/**
 * Helper function for saving output
 * @param runId Unique run identifier
 * @param output Output to save
 */
async function saveOutput(runId: string, output: string): Promise<void> {
    const outputPath = path.join(
        process.cwd(),
        'data',
        'test-agent-v3',
        'runs',
        runId,
        'output',
        'result.txt'
    );

    await fs.promises.writeFile(outputPath, output, 'utf-8');
}`,
        complete: `import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import path from 'path';
import fs from 'fs';

/**
 * Node handler for completing agent run
 * @param state Current agent state
 * @returns Updated state with run complete
 */
export const completeNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    // Save final state summary
    await saveSummary(state);

    return {
        ...state,
        status: 'completed'
    };
};

/**
 * Helper function for saving run summary
 * @param state Final state to summarize
 */
async function saveSummary(state: State): Promise<void> {
    const summary = {
        runId: state.runInfo.runId,
        startTime: state.runInfo.startTime,
        endTime: new Date().toISOString(),
        status: state.status,
        input: state.input,
        output: state.output
    };

    const summaryPath = path.join(
        process.cwd(),
        'data',
        'test-agent-v3',
        'runs',
        state.runInfo.runId,
        'output',
        'summary.json'
    );

    await fs.promises.writeFile(
        summaryPath,
        JSON.stringify(summary, null, 2),
        'utf-8'
    );
}`,
        index: `export { initializeNode } from './initialize';
export { processNode } from './process';
export { completeNode } from './complete';`
    };

    await fs.mkdir(path.join(agentPath, 'nodes'), { recursive: true });

    for (const [name, content] of Object.entries(nodes)) {
        await fs.writeFile(
            path.join(agentPath, `nodes/${name}.ts`),
            content
        );
    }
};

const createRunFile = async (agentPath: string): Promise<void> => {
    const content = `#!/usr/bin/env bun

import { Agent } from './agent';
import path from 'path';

/**
 * Main entry point for the agent
 */
const main = async () => {
    const agent = new Agent({
        configPath: path.join(__dirname, 'config', 'config.json'),
        tasksConfigPath: path.join(__dirname, 'config', 'tasks.json'),
        taskType: 'test-agent-v3'
    });

    try {
        const result = await agent.invoke('Hello, world!');
        console.log('Agent run completed successfully:', result);
    } catch (error) {
        console.error('Agent run failed:', error);
        process.exit(1);
    }
};

main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});

// Allow running directly from command line
if (require.main === module) {
    const input = process.argv[2] || 'default input';
    run(input).catch(console.error);
}`;
    await fs.writeFile(path.join(agentPath, 'run.ts'), content);
};

const main = async (): Promise<void> => {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: create-agent.ts <agent-name> [description]');
        process.exit(1);
    }

    const template: AgentTemplate = {
        name: args[0],
        description: args[1] || `${args[0]} agent`
    };

    const agentPath = path.join(process.cwd(), 'agents', template.name);

    try {
        await createDirectoryStructure(agentPath);
        await createConfigFiles(agentPath, template);
        await createTypeFile(agentPath);
        await createStateFile(agentPath);
        await createAgentFile(agentPath);
        await createRunFile(agentPath);
        await createNodeFiles(agentPath);

        console.log(`Successfully created agent scaffold at: ${agentPath}`);
    } catch (error) {
        console.error('Error creating agent scaffold:', error);
        process.exit(1);
    }
};

main().catch(console.error);
