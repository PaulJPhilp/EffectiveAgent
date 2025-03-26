import { expect, mock, test } from 'bun:test';
import { DependencyContainer } from '../di/container.js';

test('should register and resolve an instance', () => {
    // Arrange
    const container = new DependencyContainer();
    const token = Symbol('test');
    const instance = { value: 'test' };

    // Act
    container.register(token, instance);
    const resolved = container.resolve<typeof instance>(token);

    // Assert
    expect(resolved).toBe(instance);
});

test('should register and resolve a factory', () => {
    // Arrange
    const container = new DependencyContainer();
    const token = Symbol('test');
    const factoryFn = mock(() => ({ value: 'test' }));

    // Act
    container.registerFactory(token, factoryFn);
    const resolved = container.resolve(token);

    // Assert
    expect(factoryFn).toHaveBeenCalledWith(container);
    expect(resolved).toEqual({ value: 'test' });
});

test('should cache factory results', () => {
    // Arrange
    const container = new DependencyContainer();
    const token = Symbol('test');
    const factoryFn = mock(() => ({ value: 'test' }));

    // Act
    container.registerFactory(token, factoryFn);
    const first = container.resolve(token);
    const second = container.resolve(token);

    // Assert
    expect(factoryFn).toHaveBeenCalledTimes(1);
    expect(first).toBe(second); // Same instance
});

test('should resolve dependencies in factory functions', () => {
    // Arrange
    const container = new DependencyContainer();
    const dependencyToken = Symbol('dependency');
    const serviceToken = Symbol('service');
    const dependency = { name: 'dependency' };

    // Define service type
    interface TestService {
        name: string;
        dependency: typeof dependency;
    }

    // Register dependency
    container.register(dependencyToken, dependency);

    // Register service with dependency
    container.registerFactory(serviceToken, (c) => {
        const dep = c.resolve<typeof dependency>(dependencyToken);
        return {
            name: 'service',
            dependency: dep
        };
    });

    // Act
    const service = container.resolve<TestService>(serviceToken);

    // Assert
    expect(service.dependency).toBe(dependency);
});

test('should throw when resolving unregistered dependency', () => {
    // Arrange
    const container = new DependencyContainer();
    const token = Symbol('notRegistered');

    // Act & Assert
    expect(() => container.resolve(token)).toThrow(
        `No service registered for token: ${token.toString()}`
    );
}); 