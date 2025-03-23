#!/usr/bin/env bun

import { Agent } from './agent';
import path from 'path';

/**
 * Main entry point for the agent
 */
const main = async (input: string) => {
    const agent = new Agent();

    try {
        const result = await agent.invoke(input);
        console.log('Agent run completed successfully:', result);
        return result;
    } catch (error) {
        console.error('Agent run failed:', error);
        process.exit(1);
    }
};

// Allow running directly from command line
if (require.main === module) {
    const input = process.argv[2] || 'Hello, world!';
    main(input).catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}