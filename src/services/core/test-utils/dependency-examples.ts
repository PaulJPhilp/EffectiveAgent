/**
 * Example code demonstrating the direct approach for testing services with dependencies
 * based on the reviewer's suggestion.
 */

import { Cause, Context, Effect, Exit, Layer, Option } from "effect";

// --- Define a simple service with dependencies ---

// Repository dependency
interface Repository<T> {
    readonly findById: (id: string) => Effect.Effect<Option.Option<T>, RepositoryError>;
    readonly create: (data: T) => Effect.Effect<T, RepositoryError>;
}

class RepositoryError extends Error {
    readonly _tag = "RepositoryError";
    constructor(message: string) {
        super(message);
        this.name = "RepositoryError";
    }
}

// Entity model
interface Entity {
    id: string;
    name: string;
}

// Repository tags
class EntityRepository extends Context.Tag("EntityRepository")<
    EntityRepository,
    Repository<Entity>
>() { }

// Main service interface
interface EntityService {
    readonly getEntity: (id: string) => Effect.Effect<Option.Option<Entity>, ServiceError>;
    readonly createEntity: (name: string) => Effect.Effect<Entity, ServiceError>;
}

class ServiceError extends Error {
    readonly _tag = "ServiceError";
    constructor(message: string, options?: { cause?: Error }) {
        super(message, options);
        this.name = "ServiceError";
    }
}

// Service tag
class EntityApi extends Context.Tag("EntityApi")<
    EntityApi,
    EntityService
>() { }

// --- Service implementation ---

// Implementation function that depends on a repository
const makeEntityService = Effect.gen(function* () {
    const repo = yield* EntityRepository;

    const getEntity = (id: string): Effect.Effect<Option.Option<Entity>, ServiceError> => {
        return repo.findById(id).pipe(
            Effect.mapError(err => new ServiceError(`Failed to get entity: ${err.message}`, { cause: err }))
        );
    };

    const createEntity = (name: string): Effect.Effect<Entity, ServiceError> => {
        const entity: Entity = { id: crypto.randomUUID(), name };
        return repo.create(entity).pipe(
            Effect.mapError(err => new ServiceError(`Failed to create entity: ${err.message}`, { cause: err }))
        );
    };

    return {
        getEntity,
        createEntity
    };
});

// Live layer that requires EntityRepository
const EntityApiLiveLayer = Layer.effect(
    EntityApi,
    makeEntityService
);

// --- Test implementation ---

// Create in-memory repository for testing
const createInMemoryRepository = (): Effect.Effect<Repository<Entity>> => {
    return Effect.gen(function* () {
        const entities = new Map<string, Entity>();

        const findById = (id: string): Effect.Effect<Option.Option<Entity>, RepositoryError> => {
            const entity = entities.get(id);
            return Effect.succeed(Option.fromNullable(entity));
        };

        const create = (data: Entity): Effect.Effect<Entity, RepositoryError> => {
            entities.set(data.id, data);
            return Effect.succeed(data);
        };

        return {
            findById,
            create
        };
    });
};

// Create repository layer for testing
const TestRepositoryLayer = Layer.effect(
    EntityRepository,
    createInMemoryRepository()
);

// Combine layers for testing
// This approach provides both the repository and the service that depends on it
const TestLayer = Layer.provide(
    TestRepositoryLayer,
    EntityApiLiveLayer
);

// --- Test helpers ---

// Helper to run tests expecting success
const runTest = <A, E>(effect: Effect.Effect<A, E, EntityApi>): Promise<A> => {
    const providedEffect = Effect.provide(effect, TestLayer);

    const effectWithLogging = providedEffect.pipe(
        Effect.catchAllCause(cause => {
            console.error("Test Error:", Cause.pretty(cause));
            return Effect.failCause(cause);
        })
    );

    // Cast to remove any lingering R type parameter
    return Effect.runPromise(effectWithLogging as Effect.Effect<A, E, never>);
};

// Helper to run tests expecting failure
const runFailTest = <A, E>(effect: Effect.Effect<A, E, EntityApi>): Promise<Exit.Exit<A, E>> => {
    const providedEffect = Effect.provide(effect, TestLayer);

    const effectWithLogging = providedEffect.pipe(
        Effect.catchAllCause(cause => {
            console.error("Test Error:", Cause.pretty(cause));
            return Effect.failCause(cause);
        })
    );

    // Cast to remove any lingering R type parameter
    return Effect.runPromiseExit(effectWithLogging as Effect.Effect<A, E, never>) as Promise<Exit.Exit<A, E>>;
};

/**
 * Example usage in tests:
 * 
 * it('should create and retrieve an entity', async () => {
 *   const effect = Effect.gen(function*() {
 *     const service = yield* EntityApi;
 *     
 *     // Create entity
 *     const entity = yield* service.createEntity("Test Entity");
 *     
 *     // Get the entity
 *     const retrieved = yield* service.getEntity(entity.id);
 *     
 *     expect(Option.isSome(retrieved)).toBe(true);
 *     if (Option.isSome(retrieved)) {
 *       expect(retrieved.value).toEqual(entity);
 *     }
 *     
 *     return entity;
 *   });
 *   
 *   await runTest(effect);
 * });
 */ 