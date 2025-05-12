# TypeScript Type System Guidelines

## Core Principles

* Enable and maintain strict TypeScript configuration
* Avoid type assertions (`as`) unless absolutely necessary
* Never use `any` - prefer `unknown` for truly unknown types
* Leverage TypeScript's built-in utility types
* Use type inference where it provides clear and accurate types

## Type vs Interface

### Primary Rule: Prefer `interface` for Object Shapes

Always use `interface` for defining object shapes unless you have a specific reason to use `type`. This includes:

```typescript
// DO: Use interface for object shapes
interface User {
  readonly id: string
  readonly name: string
  readonly email: string
}

interface UserService {
  readonly getUser: (id: string) => Effect.Effect<User, UserError>
  readonly updateUser: (user: User) => Effect.Effect<User, UserError>
}

// DO: Use interface for service contracts
interface LoggerService {
  readonly log: (message: string) => Effect.Effect<void, never>
}

// DO: Use interface for DTOs and domain models
interface CustomerData {
  readonly customerId: string
  readonly preferences: ReadonlyArray<string>
}
```

### When to Use `type`

Use `type` for these specific cases:

1. Unions and Intersections
```typescript
// Union types
type Status = 'pending' | 'success' | 'error'
type Result<E, A> = Success<A> | Failure<E>

// Intersection types
type AdminUser = User & AdminPermissions
```

2. Function Types
```typescript
type Handler = (event: Event) => void
type AsyncProcessor<T> = (data: T) => Promise<void>
```

3. Mapped and Utility Types
```typescript
type Readonly<T> = { readonly [P in keyof T]: T[P] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
```

4. Schema and Effect Derived Types
```typescript
// Schema derived types
type Config = Schema.Schema.Type<typeof ConfigSchema>

// Effect derived types
type ServiceApi = Effect.Effect.Success<typeof make>
```

5. Complex Type Manipulations
```typescript
type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
```

### Interface Best Practices

1. Extending Interfaces
```typescript
// DO: Use interface inheritance for related types
interface BaseEntity {
  readonly id: string
  readonly createdAt: Date
}

interface User extends BaseEntity {
  readonly email: string
}
```

2. Service Definitions
```typescript
// DO: Use interfaces for service contracts
interface UserRepository {
  readonly findById: (id: string) => Effect.Effect<User, RepositoryError>
  readonly save: (user: User) => Effect.Effect<void, RepositoryError>
}
```

3. Data Transfer Objects
```typescript
// DO: Use interfaces for DTOs
interface CreateUserRequest {
  readonly email: string
  readonly password: string
}

interface CreateUserResponse {
  readonly userId: string
  readonly token: string
}
```

4. Domain Models
```typescript
// DO: Use interfaces for domain models
interface Product {
  readonly id: string
  readonly name: string
  readonly price: number
}
```

### Type Best Practices

1. Union Types for State
```typescript
// DO: Use type for union states
type ConnectionState = 
  | { readonly _tag: 'disconnected' }
  | { readonly _tag: 'connecting' }
  | { readonly _tag: 'connected', readonly sessionId: string }
```

2. Utility Type Compositions
```typescript
// DO: Use type for utility compositions
type NonEmptyArray<T> = [T, ...T[]]
type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
```

3. Function Type Utilities
```typescript
// DO: Use type for function utilities
type AsyncFunction<T, R> = (arg: T) => Promise<R>
type EffectFunction<R, E, A> = (arg: R) => Effect.Effect<A, E>
```

## Anti-patterns to Avoid

1. Mixing Interfaces and Types for Similar Concepts
```typescript
// DON'T: Mix interfaces and types for similar concepts
interface User { /* ... */ }
type UserData = { /* ... */ } // WRONG! Should be interface
```

2. Using Type for Simple Objects
```typescript
// DON'T: Use type for simple objects
type Config = { // WRONG! Should be interface
  host: string
  port: number
}
```

3. Using Interface for Non-Object Types
```typescript
// DON'T: Use interface for non-object types
interface StringOrNumber = string | number // WRONG! Should be type
```

## Type System Checklist

- [ ] Objects defined using interfaces
- [ ] Union types defined using type
- [ ] Function types defined using type
- [ ] Schema derived types using type
- [ ] Effect derived types using type
- [ ] Consistent naming conventions
- [ ] Proper readonly usage
- [ ] Clear type exports
- [ ] Documentation for complex types
- [ ] No type assertions without justification

## Best Practices

1. Type Declarations
```typescript
// DO: Explicit return types on public APIs
function processUser(user: User): Effect.Effect<ProcessedUser, ProcessError>

// DO: Let TypeScript infer types for internal implementations
const processInternalData = (data: InputData) => {
  // Type inference works well here
}

// AVOID: Unnecessary type annotations
const user: User = { id: 1, name: "John" } // Type is inferred
```

2. Generics
```typescript
// DO: Use constraints to ensure type safety
function processEntity<T extends BaseEntity>(entity: T): Effect.Effect<T, never>

// DO: Use meaningful type parameter names
interface Repository<TEntity extends BaseEntity, TId extends EntityId>

// AVOID: Overly complex generic constraints
function processData<T extends Record<string, unknown> & { id: number }>
```

3. Type Guards
```typescript
// DO: Use type guards for runtime type checking
function isUser(value: unknown): value is User {
  return Schema.is(UserSchema)(value)
}

// DO: Use Effect Schema for complex validations
const validateUser = Schema.parse(UserSchema)
```

4. Readonly Types
```typescript
// DO: Use readonly for immutable data
interface Config {
  readonly apiKey: string
  readonly endpoints: ReadonlyArray<string>
}

// DO: Use as const for literal values
const STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error'
} as const
```

5. Error Types
```typescript
// DO: Use tagged errors with Data.TaggedError
class ValidationError extends Data.TaggedError<"ValidationError">()({
  message: String,
  field: String
}) {}

// DO: Use union types for error handling
type ServiceError = ValidationError | NetworkError | NotFoundError
```

## Effect-Specific Types

1. Service Definitions
```typescript
// DO: Define service interface
interface UserServiceApi {
  readonly getUser: (id: string) => Effect.Effect<User, UserError>
  readonly createUser: (data: CreateUserRequest) => Effect.Effect<User, UserError>
  readonly updateUser: (user: User) => Effect.Effect<void, UserError>
}

// DO: Implement with Effect.Service
class UserService extends Effect.Service<UserServiceApi>()("UserService", {
  effect: Effect.gen(function* () {
    // Implementation
  })
})
```

2. Effect Return Types
```typescript
// DO: Use specific error types
type UserEffect<A> = Effect.Effect<A, UserError>
type DatabaseEffect<A> = Effect.Effect<A, DatabaseError>

// DO: Use never for infallible effects
type LogEffect = Effect.Effect<void, never>

// DO: Compose effect types
type ServiceEffect<A> = Effect.Effect<A, ServiceError | DatabaseError>
```

3. Layer Types
```typescript
// DO: Define layer types
interface UserServiceConfig {
  readonly baseUrl: string
  readonly timeout: number
}

// DO: Use Layer for configuration
const UserServiceConfigLayer = Layer.effect(
  UserServiceConfig,
  Effect.config(UserServiceConfigSchema)
)

// DO: Compose layers with types
const UserServiceLive = Layer.provide(
  UserServiceLayer,
  Layer.merge(
    UserServiceConfigLayer,
    DatabaseServiceLive
  )
)
```

4. Schema Types
```typescript
// DO: Define schema with proper types
const UserSchema = Schema.struct({
  id: Schema.string,
  email: Schema.string,
  createdAt: Schema.number
})

// DO: Derive types from schema
type User = Schema.Schema.Type<typeof UserSchema>

// DO: Use schema for validation
const validateUser = (input: unknown): Effect.Effect<User, ValidationError> =>
  Effect.try({
    try: () => Schema.parse(UserSchema)(input),
    catch: (error) => new ValidationError({ message: String(error) })
  })
```

5. Context Types
```typescript
// DO: Define service dependencies
interface ServiceContext {
  readonly UserService: UserServiceApi
  readonly DatabaseService: DatabaseServiceApi
}

// DO: Use context in effects
const getUserData = Effect.gen(function* (_) {
  const userService = yield* UserService
  const dbService = yield* DatabaseService
  // Implementation
})
```

## Additional Anti-patterns to Avoid

1. Incorrect Effect Type Usage
```typescript
// DON'T: Use Promise return types in Effect services
interface BadService {
  getData(): Promise<Data> // WRONG!
}

// DO: Use Effect return types
interface GoodService {
  readonly getData: () => Effect.Effect<Data, ServiceError>
}
```

2. Improper Error Handling
```typescript
// DON'T: Use any for error types
type BadEffect = Effect.Effect<Data, any> // WRONG!

// DON'T: Use unknown for error types
type AlsoBadEffect = Effect.Effect<Data, unknown> // WRONG!

// DO: Use specific error types
type GoodEffect = Effect.Effect<Data, DatabaseError | ValidationError>
```

3. Missing Readonly
```typescript
// DON'T: Skip readonly on service methods
interface BadService {
  getData(): Effect.Effect<Data, Error> // WRONG!
}

// DO: Use readonly on all service methods
interface GoodService {
  readonly getData: () => Effect.Effect<Data, Error>
}
```

4. Improper Layer Types
```typescript
// DON'T: Use type for layer configurations
type BadConfig = { // WRONG!
  host: string
  port: number
}

// DO: Use interface for layer configurations
interface GoodConfig {
  readonly host: string
  readonly port: number
}
```

5. Schema Type Misuse
```typescript
// DON'T: Define types manually when schema exists
type BadUser = { // WRONG!
  id: string
  email: string
}

// DO: Derive types from schema
const UserSchema = Schema.struct({
  id: Schema.string,
  email: Schema.string
})
type GoodUser = Schema.Schema.Type<typeof UserSchema>
```

6. Context Type Misuse
```typescript
// DON'T: Access services without types
const badFunction = Effect.gen(function* (_) {
  const service = yield* ServiceTag // WRONG! Missing type annotation
})

// DO: Use proper type annotations
const goodFunction = Effect.gen(function* (_): Generator<never, Result, ServiceApi> {
  const service = yield* ServiceTag
})
```

7. Mixing Patterns
```typescript
// DON'T: Mix different service patterns
class BadService { // WRONG!
  constructor(private deps: Dependencies) {}
  getData(): Effect.Effect<Data, Error> {
    return Effect.succeed(data)
  }
}

// DO: Use consistent Effect.Service pattern
class GoodService extends Effect.Service<ServiceApi>() {
  static readonly Tag = ServiceTag
  constructor(readonly deps: Dependencies) {
    super()
  }
}
```

8. Type Assertion in Effects
```typescript
// DON'T: Use type assertions in effects
const badEffect = Effect.succeed(data as Result) // WRONG!

// DO: Use proper validation
const goodEffect = Effect.try({
  try: () => Schema.parse(ResultSchema)(data),
  catch: (e) => new ValidationError(e)
})
```

## Type Safety Checklist

- [ ] All public APIs have explicit return types
- [ ] No `any` usage in the codebase
- [ ] All error types are properly tagged and typed
- [ ] Generic constraints are meaningful and not overly complex
- [ ] Type guards are used for runtime type checking
- [ ] Readonly types are used for immutable data
- [ ] Effect error channels are properly typed
- [ ] Schema is used for data validation
- [ ] Service interfaces are properly defined
- [ ] Type assertions are documented when necessary

## Advanced Effect Patterns

1. Resource Management
```typescript
// DO: Define resource types
interface DatabaseConnection {
  readonly query: <A>(sql: string) => Effect.Effect<A, DatabaseError>
  readonly close: () => Effect.Effect<void, never>
}

// DO: Use Scope for resource management
interface DatabasePoolConfig {
  readonly url: string
  readonly maxConnections: number
}

class DatabasePool extends Effect.Service<DatabasePool>() {
  static readonly Tag = Service.Tag<DatabasePool>()
  
  readonly acquireConnection = Effect.acquireRelease(
    // Acquisition
    Effect.succeed<DatabaseConnection>({
      query: <A>(sql: string) => Effect.succeed<A, DatabaseError>(/* ... */),
      close: () => Effect.succeed(void 0)
    }),
    // Release
    (connection) => connection.close()
  )
}

// DO: Use with Scope
const program = Effect.gen(function* (_) {
  const pool = yield* DatabasePool.Tag
  const connection = yield* pool.acquireConnection
  const result = yield* connection.query("SELECT * FROM users")
  return result
})
```

2. Fiber Management
```typescript
// DO: Define fiber-aware types
interface WorkerPool {
  readonly submit: <E, A>(task: Effect.Effect<A, E>) => Effect.Effect<Fiber.RuntimeFiber<A, E>>
  readonly shutdown: () => Effect.Effect<void, never>
}

// DO: Implement fiber-based services
class WorkerPoolLive extends Effect.Service<WorkerPool>() {
  static readonly Tag = Service.Tag<WorkerPool>()
  
  private readonly workers: Ref.Ref<Set<Fiber.RuntimeFiber<any, any>>>
  
  readonly submit = <E, A>(task: Effect.Effect<A, E>) =>
    Effect.gen(function* (_) {
      const fiber = yield* Effect.fork(task)
      yield* Ref.update(this.workers, workers => workers.add(fiber))
      return fiber
    })
    
  readonly shutdown = Effect.gen(function* (_) {
    const workers = yield* Ref.get(this.workers)
    yield* Effect.forEach(
      Array.from(workers),
      fiber => Fiber.interrupt(fiber)
    )
  })
}
```

3. Stream Types
```typescript
// DO: Define stream-based services
interface StreamProcessor {
  readonly process: <E, A>(
    stream: Stream.Stream<A, E>
  ) => Stream.Stream<A, E | ProcessingError>
}

// DO: Implement stream processing
class StreamProcessorLive extends Effect.Service<StreamProcessor>() {
  static readonly Tag = Service.Tag<StreamProcessor>()
  
  readonly process = <E, A>(stream: Stream.Stream<A, E>) =>
    stream.pipe(
      Stream.map((a) => this.transform(a)),
      Stream.mapError((e) => new ProcessingError({ cause: e }))
    )
    
  private transform = <A>(a: A): A => /* ... */
}
```

4. Advanced Resource Management
```typescript
// DO: Define resource-aware interfaces
interface ManagedResource<R> {
  readonly acquire: Effect.Effect<R, ResourceError>
  readonly release: (resource: R) => Effect.Effect<void, never>
  readonly use: <A>(resource: R, f: (r: R) => Effect.Effect<A, ResourceError>) => Effect.Effect<A, ResourceError>
}

// DO: Implement resource lifecycle management
class ResourceManager<R> extends Effect.Service<ManagedResource<R>>() {
  constructor(
    private readonly config: ResourceConfig,
    private readonly resources: Ref.Ref<Map<string, R>>,
    private readonly semaphore: Semaphore.Semaphore
  ) {
    super()
  }

  // DO: Use semaphore for concurrent access
  readonly acquire = Effect.gen(function* (_) {
    yield* this.semaphore.withPermit(
      Effect.gen(function* (_) {
        const resource = yield* this.createResource()
        yield* Ref.update(this.resources, map => map.set(resource.id, resource))
        return resource
      })
    )
  })

  // DO: Ensure clean resource release
  readonly release = (resource: R) =>
    Effect.gen(function* (_) {
      yield* this.semaphore.withPermit(
        Effect.gen(function* (_) {
          yield* this.cleanupResource(resource)
          yield* Ref.update(this.resources, map => {
            map.delete(resource.id)
            return map
          })
        })
      )
    })

  // DO: Safe resource usage with automatic cleanup
  readonly use = <A>(
    resource: R,
    f: (r: R) => Effect.Effect<A, ResourceError>
  ) =>
    Effect.acquireUseRelease(
      Effect.succeed(resource),
      f,
      this.release
    )
}

// DO: Implement resource pooling
interface PoolConfig {
  readonly maxSize: number
  readonly minSize: number
  readonly validationInterval: Duration
}

class ResourcePool<R> extends Effect.Service<ResourcePool<R>>() {
  constructor(
    private readonly manager: ResourceManager<R>,
    private readonly config: PoolConfig,
    private readonly pool: Queue.Queue<R>,
    private readonly validation: Schedule.Schedule<unknown, unknown>
  ) {
    super()
  }

  // DO: Implement pool initialization
  static readonly make = <R>(
    manager: ResourceManager<R>,
    config: PoolConfig
  ): Effect.Effect<ResourcePool<R>, never> =>
    Effect.gen(function* (_) {
      const pool = yield* Queue.bounded<R>(config.maxSize)
      const validation = Schedule.fixed(config.validationInterval)
      
      const instance = new ResourcePool(manager, config, pool, validation)
      yield* instance.initialize()
      return instance
    })

  // DO: Initialize pool with minimum resources
  private readonly initialize = Effect.gen(function* (_) {
    const initialResources = yield* Effect.forEach(
      Range.range(0, this.config.minSize),
      () => this.manager.acquire
    )
    yield* Effect.forEach(
      initialResources,
      resource => Queue.offer(this.pool, resource)
    )
    yield* this.startValidation()
  })

  // DO: Implement resource validation
  private readonly startValidation = Effect.gen(function* (_) {
    yield* Effect.repeat(
      Effect.gen(function* (_) {
        const resource = yield* Queue.take(this.pool)
        const isValid = yield* this.validateResource(resource)
        if (isValid) {
          yield* Queue.offer(this.pool, resource)
        } else {
          yield* this.manager.release(resource)
          const newResource = yield* this.manager.acquire
          yield* Queue.offer(this.pool, newResource)
        }
      }),
      this.validation
    )
  })

  // DO: Implement safe resource borrowing
  readonly withResource = <A>(
    f: (resource: R) => Effect.Effect<A, ResourceError>
  ): Effect.Effect<A, ResourceError> =>
    Effect.gen(function* (_) {
      const resource = yield* Queue.take(this.pool)
      return yield* Effect.acquireUseRelease(
        Effect.succeed(resource),
        f,
        (r) => Queue.offer(this.pool, r)
      )
    })
}

// DO: Implement composite resources
interface CompositeResource {
  readonly db: DatabaseConnection
  readonly cache: CacheConnection
  readonly messaging: MessagingClient
}

class CompositeResourceManager extends Effect.Service<ManagedResource<CompositeResource>>() {
  constructor(
    private readonly dbManager: ResourceManager<DatabaseConnection>,
    private readonly cacheManager: ResourceManager<CacheConnection>,
    private readonly messagingManager: ResourceManager<MessagingClient>
  ) {
    super()
  }

  // DO: Implement coordinated resource acquisition
  readonly acquire = Effect.gen(function* (_) {
    const db = yield* this.dbManager.acquire
    const acquireRest = Effect.all([
      this.cacheManager.acquire,
      this.messagingManager.acquire
    ])

    return yield* Effect.catchAll(
      acquireRest,
      (error) => Effect.gen(function* (_) {
        yield* this.dbManager.release(db)
        return yield* Effect.fail(error)
      })
    ).pipe(
      Effect.map(([cache, messaging]) => ({
        db,
        cache,
        messaging
      }))
    )
  })

  // DO: Implement ordered resource release
  readonly release = (resource: CompositeResource) =>
    Effect.gen(function* (_) {
      yield* Effect.all([
        this.messagingManager.release(resource.messaging),
        this.cacheManager.release(resource.cache)
      ])
      yield* this.dbManager.release(resource.db)
    })

  // DO: Implement safe composite resource usage
  readonly use = <A>(
    resource: CompositeResource,
    f: (r: CompositeResource) => Effect.Effect<A, ResourceError>
  ) =>
    Effect.acquireUseRelease(
      Effect.succeed(resource),
      f,
      this.release
    )
}

// DO: Implement resource usage patterns
const program = Effect.gen(function* (_) {
  const pool = yield* ResourcePool.make(dbManager, {
    maxSize: 10,
    minSize: 2,
    validationInterval: Duration.seconds(30)
  })

  const result = yield* pool.withResource((connection) =>
    connection.query("SELECT * FROM users")
  )

  const compositeManager = new CompositeResourceManager(
    dbManager,
    cacheManager,
    messagingManager
  )

  return yield* compositeManager.use(
    yield* compositeManager.acquire,
    (resources) => Effect.gen(function* (_) {
      const users = yield* resources.db.query("SELECT * FROM users")
      yield* resources.cache.set("users", users)
      yield* resources.messaging.publish("users.updated", users)
      return users
    })
  )
})
```

## Complex Layer Composition

1. Multi-Layer Dependencies
```typescript
// DO: Define clear layer dependencies
interface DatabaseConfig {
  readonly url: string
  readonly poolSize: number
}

interface CacheConfig {
  readonly host: string
  readonly port: number
}

// Layer definitions
const DatabaseConfigLayer = Layer.effect(
  Service.Tag<DatabaseConfig>(),
  Effect.config(DatabaseConfigSchema)
)

const CacheConfigLayer = Layer.effect(
  Service.Tag<CacheConfig>(),
  Effect.config(CacheConfigSchema)
)

const DatabaseLayer = Layer.provide(
  DatabaseServiceLive,
  DatabaseConfigLayer
)

const CacheLayer = Layer.provide(
  CacheServiceLive,
  CacheConfigLayer
)

// Complex composition
const InfrastructureLayer = Layer.merge(
  DatabaseLayer,
  CacheLayer
)

const BusinessLayer = Layer.provide(
  Layer.merge(
    UserServiceLive,
    OrderServiceLive
  ),
  InfrastructureLayer
)

const ApplicationLayer = Layer.provide(
  ApiServiceLive,
  Layer.merge(
    BusinessLayer,
    AuthenticationLayer,
    LoggingLayer
  )
)
```

2. Dynamic Layer Configuration
```typescript
// DO: Define configuration types
interface ServiceConfig<T> {
  readonly type: "memory" | "persistent"
  readonly options: T
}

// DO: Create factory functions for layers
const createStorageLayer = <T>(config: ServiceConfig<T>) =>
  config.type === "memory"
    ? MemoryStorageLayer
    : PersistentStorageLayer(config.options)

// DO: Compose dynamic layers
const createApplicationLayer = (config: ApplicationConfig) =>
  Layer.provide(
    ApiServiceLive,
    Layer.merge(
      createStorageLayer(config.storage),
      createCacheLayer(config.cache),
      createAuthLayer(config.auth)
    )
  )
```

3. Testing Layer Composition
```typescript
// DO: Define test-specific types
interface TestContext {
  readonly clock: TestClock
  readonly random: TestRandom
}

// DO: Create test layers
const TestEnvironment = Layer.merge(
  TestClockLayer,
  TestRandomLayer,
  MockDatabaseLayer,
  MockCacheLayer
)

// DO: Type test effects properly
type TestEffect<A> = Effect.Effect<
  A,
  never,
  TestContext & DatabaseService & CacheService
>

// DO: Compose test layers
const runTest = <A>(effect: TestEffect<A>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(TestEnvironment)
    )
  )
```

4. Error Channel Composition
```typescript
// DO: Define specific error types
class DatabaseError extends Data.TaggedError<"DatabaseError">()
class CacheError extends Data.TaggedError<"CacheError">()
class ValidationError extends Data.TaggedError<"ValidationError">()

// DO: Compose error types
type InfrastructureError = DatabaseError | CacheError
type ApplicationError = InfrastructureError | ValidationError

// DO: Type effects with composed errors
type ApplicationEffect<A> = Effect.Effect<A, ApplicationError>

// DO: Handle composed errors
const handleError = (error: ApplicationError): Effect.Effect<void, never> =>
  Effect.gen(function* (_) {
    switch (error._tag) {
      case "DatabaseError":
        yield* LogError("Database error", error)
        break
      case "CacheError":
        yield* LogWarning("Cache error", error)
        break
      case "ValidationError":
        yield* LogInfo("Validation error", error)
        break
    }
  })
``` 