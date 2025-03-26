import { join } from 'path';

/**
 * Gets the root path for agent configuration files
 * @param agentName Name of the agent (e.g., 'normalizing-new', 'persona-image-new')
 * @returns The absolute path to the agent's root directory
 */
export function getAgentRoot(agentName: string): string {
    return join(process.cwd(), 'src', 'agents', agentName);
}

/**
 * Gets the path to a shared configuration file
 * @param filename Name of the shared configuration file
 * @returns The absolute path to the shared configuration file
 */
export function getSharedConfigPath(filename: string): string {
    return join(process.cwd(), 'src', 'agents', 'config', filename);
}

/**
 * Gets the path to an agent-specific configuration file
 * @param agentName Name of the agent
 * @param filename Name of the configuration file
 * @returns The absolute path to the agent-specific configuration file
 */
export function getAgentConfigPath(agentName: string, filename: string): string {
    return join(getAgentRoot(agentName), 'config', filename);
} 