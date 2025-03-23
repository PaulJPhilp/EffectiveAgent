import type { State } from './types';
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
    return `run-${timestamp}-${randomChars}`;
}