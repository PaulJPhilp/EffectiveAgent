import type { AgentConfig } from '../../../agents/agent-service/types.ts';
import { DependencyContainer } from '../../di/container.ts';
import { SERVICE_TOKENS } from '../../di/tokens.ts';
import { ProviderConfigurationService } from './providerConfigurationService.ts';
import { ProviderService } from './providerService.ts';

/**
 * Service bootstrap for initializing the DI container with services
 */
export class ServiceBootstrap {
    private container: DependencyContainer;

    /**
     * Create a new ServiceBootstrap instance
     * @param agentConfig Agent configuration
     */
    constructor(private readonly agentConfig: AgentConfig) {
        this.container = new DependencyContainer();
        this.registerServices();
    }

    /**
     * Register all services in the DI container
     */
    private registerServices(): void {
        // Register agent config
        this.container.register(SERVICE_TOKENS.agentConfig, this.agentConfig);

        // Register provider configuration service
        this.container.registerFactory(
            SERVICE_TOKENS.providerConfigService,
            () => {
                const service = new ProviderConfigurationService({
                    configPath: this.agentConfig.configFiles.providers,
                    environment: this.agentConfig.environment
                });

                // Initialize configuration asynchronously
                service.loadConfigurations().catch(error => {
                    console.error('[ServiceBootstrap] Failed to load provider configurations:', error);
                });

                return service;
            }
        );

        // Register model configuration service (stub, to be implemented)
        this.container.registerFactory(
            SERVICE_TOKENS.modelConfigService,
            () => {
                return {
                    getModel: (id: string) => ({ id, provider: 'openai' }),
                    getDefaultModel: () => ({ id: 'default-model', provider: 'openai' })
                };
            }
        );

        // Register provider service with dependencies
        this.container.registerFactory(
            SERVICE_TOKENS.providerService,
            (container) => {
                return new ProviderService(
                    container.resolve(SERVICE_TOKENS.agentConfig),
                    container.resolve(SERVICE_TOKENS.providerConfigService),
                    container.resolve(SERVICE_TOKENS.modelConfigService)
                );
            }
        );
    }

    /**
     * Get the DI container with registered services
     * @returns DI container instance
     */
    public getContainer(): DependencyContainer {
        return this.container;
    }
} 