import { join } from 'path';
import { PersonaEvaluatorAgent } from './persona-evaluator-agent.js';

/**
 * Validates the configuration for the persona evaluator agent
 */
export async function validatePersonaEvaluatorAgent(): Promise<void> {
    // Force development mode for validation
    process.env.NODE_ENV = 'development';

    // Get the agent's config path
    const configPath = join(process.cwd(), 'src', 'agents', 'persona-evaluator-new', 'config');

    // Create agent - this will validate all configs in development mode
    new PersonaEvaluatorAgent({ configPath });
}

// Allow running directly
if (require.main === module) {
    validatePersonaEvaluatorAgent()
        .then(() => {
            console.log('✅ Persona evaluator agent configuration is valid');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
} 