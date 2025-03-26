import { join } from 'path';
import { NormalizingAgent } from './normalizing-agent.js';

/**
 * Validates the configuration for the normalizing agent
 */
export async function validateNormalizingAgent(): Promise<void> {
    try {
        // Force development mode for validation
        process.env.NODE_ENV = 'development';

        // Get the agent's config path
        const configPath = join(process.cwd(), 'src', 'agents', 'normalizing-new', 'config');

        // Create agent - this will validate all configs in development mode
        new NormalizingAgent({ configPath });

        console.log('✅ Normalizing agent configuration is valid');
        process.exit(0);
    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    }
}

// Allow running directly
if (require.main === module) {
    validateNormalizingAgent()
        .then(() => {
            console.log('✅ Normalizing agent configuration is valid');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
} 