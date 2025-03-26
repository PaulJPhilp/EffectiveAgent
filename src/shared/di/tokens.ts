/**
 * Service tokens for dependency injection
 * These unique symbols identify services in the DI container
 */
export const SERVICE_TOKENS = {
    // Core tokens
    agentConfig: Symbol('agentConfig'),

    // Provider service tokens
    providerService: Symbol('providerService'),
    providerConfigService: Symbol('providerConfigService'),

    // Model service tokens
    modelConfigService: Symbol('modelConfigService')
}; 