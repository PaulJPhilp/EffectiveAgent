/**
 * Dependency Injection container implementation
 * Provides service registration and resolution
 */
export class DependencyContainer {
    private services = new Map<symbol, any>();
    private factories = new Map<symbol, (container: DependencyContainer) => any>();

    /**
     * Register an existing instance
     * @param token - Unique identifier for the service
     * @param instance - Service instance
     */
    register<T>(token: symbol, instance: T): void {
        this.services.set(token, instance);
    }

    /**
     * Register a factory function for lazy initialization
     * @param token - Unique identifier for the service
     * @param factory - Factory function that creates the service
     */
    registerFactory<T>(token: symbol, factory: (container: DependencyContainer) => T): void {
        this.factories.set(token, factory);
    }

    /**
     * Resolve a dependency by its token
     * @param token - Unique identifier for the service
     * @returns The resolved service instance
     * @throws Error if service is not registered
     */
    resolve<T>(token: symbol): T {
        // Check if we already have an instance
        if (this.services.has(token)) {
            return this.services.get(token) as T;
        }

        // Check if we have a factory
        if (this.factories.has(token)) {
            const factory = this.factories.get(token)!;
            const instance = factory(this);
            // Cache instance for future resolves
            this.services.set(token, instance);
            return instance as T;
        }

        throw new Error(`No service registered for token: ${token.toString()}`);
    }
} 