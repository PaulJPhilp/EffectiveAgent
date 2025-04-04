import { join } from 'path';
import { PersonaImageAgent } from './persona-image-agent.js';

/**
 * Validates the configuration for the persona image agent
 */
export async function validatePersonaImageAgent(): Promise<void> {
    // Force development mode for validation
    process.env.NODE_ENV = 'development';

    // Get the agent's config path
    const configPath = join(process.cwd(), 'src', 'agents', 'persona-image-new', 'config');

    // Create agent - this will validate all configs in development mode
    new PersonaImageAgent({ configPath });
}

// Allow running directly
if (require.main === module) {
    validatePersonaImageAgent()
        .then(() => {
            console.log('✅ Persona image agent configuration is valid');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
} 