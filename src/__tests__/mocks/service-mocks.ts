/**
 * Mock service implementations for testing
 * 
 * This module provides mock implementations of services that can be used
 * in tests to isolate the service under test from its dependencies.
 */

// Test harness removed - using direct Effect.runPromise instead
import { Context, Layer, Ref } from "effect";

/**
 * Creates a Layer that provides a mocked service
 */
const createMockLayer = <T extends object>(
    tag: Context.Tag<T, T>,
    implementation: T
): Layer.Layer<T, never, never> => {
    return Layer.succeed(tag, implementation);
};

/**
 * Creates a mock implementation of a service that records interactions
 * 
 * @param tag - The Context tag for the service
 * @param implementation - The mock implementation
 * @returns A Layer that provides the mocked service and methods to verify calls
 */
export const createMockService = <T extends object>(
    tag: Context.Tag<T, T>,
    implementation: T
): {
    layer: Layer.Layer<T, never, never>;
    calls: <K extends keyof T>(methodName: K) => Promise<unknown[]>;
    reset: () => Promise<void>;
} => {

    // Create a map to store method calls
    const callStore = new Map<string, unknown[]>()
    const callStoreRef = Ref.make(callStore)

    // Create a proxy to track method calls
    const proxy = new Proxy(implementation, {
        get: (target, prop: string) => {
            const originalMethod = target[prop as keyof typeof target]

            if (typeof originalMethod === 'function') {
                return (...args: unknown[]) => {
                    // Record the call
                    const calls = callStore.get(prop) || []
                    calls.push(args)
                    callStore.set(prop, calls)

                    // Call the original method
                    return originalMethod.apply(target, args)
                }
            }

            return originalMethod
        }
    })

    // Create a layer with the mocked service
    const layer = createMockLayer(tag, proxy)

    // Methods to verify calls
    const calls = async <K extends keyof T>(methodName: K): Promise<unknown[]> => {
        return callStore.get(methodName as string) || []
    }

    // Reset call history
    const reset = async (): Promise<void> => {
        callStore.clear()
    }

    return { layer, calls, reset }
}

/**
 * Creates a spy implementation that tracks method calls on a real service
 * 
 * @param instance - The service instance to spy on
 * @returns A proxied instance that records calls and the original methods
 */
export const spyOn = <T extends object>(instance: T): {
    proxy: T;
    calls: <K extends keyof T>(methodName: K) => unknown[];
    reset: () => void;
} => {
    const callStore = new Map<string, unknown[]>()

    // Create a proxy to track method calls
    const proxy = new Proxy(instance, {
        get: (target, prop: string) => {
            const originalMethod = target[prop as keyof typeof target]

            if (typeof originalMethod === 'function') {
                return (...args: unknown[]) => {
                    // Record the call
                    const calls = callStore.get(prop) || []
                    calls.push(args)
                    callStore.set(prop, calls)

                    // Call the original method
                    return originalMethod.apply(target, args)
                }
            }

            return originalMethod
        }
    })

    // Methods to verify calls
    const calls = <K extends keyof T>(methodName: K): unknown[] => {
        return callStore.get(methodName as string) || []
    }

    // Reset call history
    const reset = (): void => {
        callStore.clear()
    }

    return { proxy, calls, reset }
}