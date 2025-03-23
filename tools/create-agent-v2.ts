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

const createConfigFiles = async (agentPath: string, template: AgentTemplate): Promise<void> => {
    const configContent = {
        name: template.name,
        description: template.description,
        version: '0.1.0'
    };

    const providersContent = {
        providers: {
            openai: {
                type: 'openai',
                apiVersion: '2024-02'
            }
        },
        defaultProvider: 'openai'
    };

    const modelsContent = {
        models: {
            'text-default': {
                id: 'gpt-4-turbo-preview',
                provider: 'openai',
                capabilities: ['text-generation']
            }
        },
        defaultModel: 'text-default'
    };

    const tasksContent = {
        tasks: {
            'process': {
                description: 'Basic processing task',
                modelId: 'text-default',
                capabilities: ['text-generation']
            }
        }
    };

    await fs.writeFile(
        path.join(agentPath, 'config/config.json'),
        JSON.stringify(configContent, null, 2)
    );
    await fs.writeFile(
        path.join(agentPath, 'config/providers.json'),
        JSON.stringify(providersContent, null, 2)
    );
    await fs.writeFile(
        path.join(agentPath, 'config/models.json'),
        JSON.stringify(modelsContent, null, 2)
    );
    await fs.writeFile(
        path.join(agentPath, 'config/tasks.json'),
        JSON.stringify(tasksContent, null, 2)
    );
};

const createTypeFile = async (agentPath: string): Promise<void> => {
    const content = `import type { BaseState } from '../../shared/types';

export interface State extends BaseState {
    readonly input?: string;
    readonly output?: string;
}

export interface StateChannels {
    readonly status: string;
    readonly input?: string;
    readonly output?: string;
}

export type NodeNames = 'initialize' | 'process' | 'complete';
`;
    await fs.writeFile(path.join(agentPath, 'types.ts'), content);
};

const createStateFile = async (agentPath: string): Promise<void> => {
    const content = `import type { State } from './types';

export const createInitialState = (): State => ({
    status: 'initializing'
});

export const updateState = (state: State, updates: Partial<State>): State => ({
    ...state,
    ...updates
});
`;
    await fs.writeFile(path.join(agentPath, 'state.ts'), content);
};

const createAgentFile = async (agentPath: string): Promise<void> => {
    const content = `import { END, START, StateGraph } from '@langchain/langgraph';
import type { State, NodeNames, StateChannels } from './types';
import { createInitialState } from './state';
import { initialize } from './nodes/initialize';
import { process } from './nodes/process';
import { complete } from './nodes/complete';
import { ConfigLoader } from '../../shared/config';
import { join } from 'path';

export class Agent {
    private readonly graph: ReturnType<typeof this.createGraph>;
    private readonly configLoader: ConfigLoader;

    constructor({ configPath }: { configPath: string }) {
        this.configLoader = new ConfigLoader(configPath);
        this.graph = this.createGraph();
    }

    private createGraph() {
        const graph = new StateGraph<State, NodeNames>({
            channels: {
                status: {
                    value: (x: State) => x.status,
                    default: 'initializing'
                },
                input: {
                    value: (x: State) => x.input,
                    default: undefined
                },
                output: {
                    value: (x: State) => x.output,
                    default: undefined
                }
            }
        });

        graph.addNode('initialize', initialize);
        graph.addNode('process', process);
        graph.addNode('complete', complete);

        graph.addEdge('initialize', 'process');
        graph.addEdge('process', 'complete');

        graph.setEntryPoint(START);
        graph.setFinishPoint(END);

        return graph.compile();
    }

    async invoke(input: string): Promise<State> {
        const initialState = createInitialState();
        initialState.input = input;
        return this.graph.invoke(initialState);
    }
}`;
    await fs.writeFile(path.join(agentPath, 'agent.ts'), content);
};

const createNodeFiles = async (agentPath: string): Promise<void> => {
    const nodes = {
        initialize: `import { END } from '@langchain/langgraph';
import type { State } from '../types';

export const initialize = async (state: State): Promise<'process'> => {
    state.status = 'processing';
    return 'process';
};`,
        process: `import { END } from '@langchain/langgraph';
import type { State } from '../types';

export const process = async (state: State): Promise<'complete'> => {
    state.status = 'completing';
    state.output = \`Processed: \${state.input}\`;
    return 'complete';
};`,
        complete: `import { END } from '@langchain/langgraph';
import type { State } from '../types';

export const complete = async (state: State): Promise<typeof END> => {
    state.status = 'completed';
    return END;
};`
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
    const content = `import { Agent } from './agent';
import { join } from 'path';

export const run = async (input: string): Promise<void> => {
    const agent = new Agent({
        configPath: join(__dirname, 'config')
    });
    
    const result = await agent.invoke(input);
    console.log('Result:', result.output);
};

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
