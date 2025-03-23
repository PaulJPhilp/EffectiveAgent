#!/usr/bin/env tsx

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
    const content = `import { StateGraph } from '@langchain/langgraph';
import type { State, NodeNames } from './types';
import { createInitialState } from './state';
import { initialize } from './nodes/initialize';
import { process } from './nodes/process';
import { complete } from './nodes/complete';

export class Agent extends StateGraph<State, NodeNames> {
    constructor() {
        super();
        
        this.addNode('initialize', initialize);
        this.addNode('process', process);
        this.addNode('complete', complete);
        
        this.addEdge('initialize', 'process');
        this.addEdge('process', 'complete');
        
        this.setEntryPoint('initialize');
    }
}
`;
    await fs.writeFile(path.join(agentPath, 'agent.ts'), content);
};

const createRunFile = async (agentPath: string): Promise<void> => {
    const content = `import { Agent } from './agent';
import { createInitialState } from './state';

export const run = async (input: string): Promise<void> => {
    const agent = new Agent();
    const initialState = createInitialState();
    
    initialState.input = input;
    
    const result = await agent.invoke(initialState);
    console.log('Result:', result.output);
};

// Allow running directly from command line
if (require.main === module) {
    const input = process.argv[2] || 'default input';
    run(input).catch(console.error);
}
`;
    await fs.writeFile(path.join(agentPath, 'run.ts'), content);
};

const createNodeFiles = async (agentPath: string): Promise<void> => {
    const nodes = {
        initialize: `import type { State } from '../types';

export const initialize = async (state: State): Promise<State> => ({
    ...state,
    status: 'processing'
});`,
        process: `import type { State } from '../types';

export const process = async (state: State): Promise<State> => ({
    ...state,
    status: 'completing',
    output: \`Processed: \${state.input}\`
});`,
        complete: `import type { State } from '../types';

export const complete = async (state: State): Promise<State> => ({
    ...state,
    status: 'completed'
});`
    };

    await fs.mkdir(path.join(agentPath, 'nodes'), { recursive: true });
    
    for (const [name, content] of Object.entries(nodes)) {
        await fs.writeFile(
            path.join(agentPath, `nodes/${name}.ts`),
            content
        );
    }
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
