import { PersonaGeneratorAgent } from './persona-generator-agent.js';

/**
 * Validates the configuration for the persona generator agent
 */
export async function validatePersonaGeneratorAgent(): Promise<void> {
    console.log(`validatePersonaGeneratorAgent()`)
    // Force development mode for validation
    // Force development mode for validation
    process.env['NODE_ENV'] = 'development';

    // Create agent - this will validate all configs in development mode
    new PersonaGeneratorAgent('persona-generator-new' );
}

// Allow running directly
if (require.main === module) {
    validatePersonaGeneratorAgent()
        .then(() => {
            console.log('✅ Persona generator agent configuration is valid');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        });
} 