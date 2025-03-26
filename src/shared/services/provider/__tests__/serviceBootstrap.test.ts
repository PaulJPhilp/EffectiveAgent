import { describe, expect, test } from 'vitest';
import { DependencyContainer, SERVICE_TOKENS } from '../di/index.js';

// We'll implement these later
class ServiceBootstrap {
    private container: DependencyContainer;

    constructor(private readonly agentConfig: any) {
        this.container = new DependencyContainer();
        this.registerServices();
    }

    private registerServices(): void {
        // Register agent config
        this.container.register(SERVICE_TOKENS.agentConfig, this.agentConfig);

        // Register other services
        this.container.registerFactory(
            SERVICE_TOKENS.providerConfigService,
            () => ({}) // Mocked for test
        );

        this.container.registerFactory(
            SERVICE_TOKENS.providerService,
            (container) => ({}) // Mocked for test
        );
    }

    public getContainer(): DependencyContainer {
        return this.container;
    }
}

describe('ServiceBootstrap', () => {
    const mockAgentConfig = {
        name: 'test-agent',
        environment: 'test',
        configFiles: {
            providers: '/path/to/providers',
            models: '/path/to/models'
        }
    };

    test('should register agent config in container', () => {
        // Arrange & Act
        const bootstrap = new ServiceBootstrap(mockAgentConfig);
        const container = bootstrap.getContainer();

        // Assert
        const config = container.resolve(SERVICE_TOKENS.agentConfig);
        expect(config).toBe(mockAgentConfig);
    });

    test('should register provider configuration service', () => {
        // Arrange
        const bootstrap = new ServiceBootstrap(mockAgentConfig);
        const container = bootstrap.getContainer();

        // Act & Assert - we just want to ensure it doesn't throw
        expect(() => {
            const service = container.resolve(SERVICE_TOKENS.providerConfigService);
        }).not.toThrow();
    });

    test('should register provider service', () => {
        // Arrange
        const bootstrap = new ServiceBootstrap(mockAgentConfig);
        const container = bootstrap.getContainer();

        // Act & Assert - we just want to ensure it doesn't throw
        expect(() => {
            const service = container.resolve(SERVICE_TOKENS.providerService);
        }).not.toThrow();
    });

    test('should resolve dependencies in the correct order', () => {
        // This is a more complex test that would verify the resolution order
        // We're mocking this here since we haven't implemented the actual services yet

        // Arrange - create a container with a dependency graph
        const container = new DependencyContainer();

        const registerOrder: string[] = [];

        // Register dependencies in order
        container.registerFactory(SERVICE_TOKENS.agentConfig, () => {
            registerOrder.push('agentConfig');
            return mockAgentConfig;
        });

        container.registerFactory(SERVICE_TOKENS.providerConfigService, (c) => {
            // Should resolve agentConfig first
            c.resolve(SERVICE_TOKENS.agentConfig);
            registerOrder.push('providerConfigService');
            return {};
        });

        container.registerFactory(SERVICE_TOKENS.providerService, (c) => {
            // Should resolve both dependencies first
            c.resolve(SERVICE_TOKENS.agentConfig);
            c.resolve(SERVICE_TOKENS.providerConfigService);
            registerOrder.push('providerService');
            return {};
        });

        // Act
        container.resolve(SERVICE_TOKENS.providerService);

        // Assert - verify resolution order
        expect(registerOrder).toEqual([
            'agentConfig',
            'providerConfigService',
            'providerService'
        ]);
    });
}); 