# Service Hierarchy Guidelines

## Service Layer Organization

Our service architecture follows a clean, layered approach with clear separation of concerns.

## Core Services

Core services represent the fundamental building blocks of our application.

```typescript
interface CoreServices {
  readonly filesystem: FileSystemService
  readonly config: ConfigurationService
  readonly logging: LoggingService
  readonly cache: CacheService
  readonly scheduler: SchedulerService
  readonly metrics: MetricsService
}
```

### Characteristics
- Foundation of the application
- No business logic
- High reusability
- Minimal dependencies
- Stateless when possible

### Examples
- File system operations
- Configuration management
- Logging and telemetry
- Caching mechanisms
- Task scheduling
- Metric collection

## Business Services

Business services implement domain-specific logic and workflows.

```typescript
interface BusinessServices {
  readonly agent: AgentService
  readonly prompt: PromptService
  readonly skill: SkillService
  readonly workflow: WorkflowService
  readonly memory: MemoryService
}
```

### Characteristics
- Implement business rules
- Domain-specific logic
- May depend on core services
- Stateful when required
- Clear bounded contexts

### Examples
- Agent management
- Prompt handling
- Skill execution
- Workflow orchestration
- Memory management

## Infrastructure Services

Infrastructure services handle external system interactions and technical concerns.

```typescript
interface InfrastructureServices {
  readonly database: DatabaseService
  readonly messaging: MessagingService
  readonly http: HttpClientService
  readonly ai: AIProviderService
  readonly storage: StorageService
}
```

### Characteristics
- Handle external dependencies
- Provide technical capabilities
- Abstract third-party services
- Handle connection management
- Implement retry logic

### Examples
- Database operations
- Message queuing
- HTTP clients
- AI provider integration
- Cloud storage access

## Cross-Cutting Services

Cross-cutting services provide functionality used across all layers.

```typescript
interface CrossCuttingServices {
  readonly auth: AuthenticationService
  readonly monitoring: MonitoringService
  readonly validation: ValidationService
  readonly error: ErrorHandlingService
  readonly security: SecurityService
}
```

### Characteristics
- Used by multiple layers
- Consistent across application
- Aspect-oriented concerns
- Configuration-driven
- Standard patterns

### Examples
- Authentication/Authorization
- Monitoring and alerting
- Input validation
- Error handling
- Security controls

## Service Dependencies

```typescript
interface ServiceDependencies {
  // Core -> No dependencies outside core
  readonly core: never

  // Business -> Can depend on core
  readonly business: CoreServices

  // Infrastructure -> Can depend on core
  readonly infrastructure: CoreServices

  // Cross-cutting -> Can depend on core
  readonly crossCutting: CoreServices
}
```

## Best Practices

1. Dependency Direction
```typescript
// DO: Follow dependency rules
class BusinessService extends Effect.Service<BusinessServiceApi>() {
  constructor(
    private readonly core: CoreServices,
    private readonly config: ConfigService
  ) {}
}

// DON'T: Create circular dependencies
class CoreService extends Effect.Service<CoreServiceApi>() {
  constructor(
    private readonly business: BusinessService // WRONG!
  ) {}
}
```

2. Service Registration
```typescript
// DO: Register services in appropriate layers
const CoreLayer = Layer.merge(
  FileSystemLive,
  ConfigurationLive,
  LoggingLive
)

const BusinessLayer = Layer.provide(
  Layer.merge(
    AgentLive,
    PromptLive,
    SkillLive
  ),
  CoreLayer
)
```

3. Cross-Cutting Concerns
```typescript
// DO: Use cross-cutting services consistently
class BaseService extends Effect.Service<BaseServiceApi>() {
  constructor(
    protected readonly auth: AuthenticationService,
    protected readonly monitoring: MonitoringService
  ) {}
}

// DO: Extend base service
class BusinessService extends BaseService {
  // Inherits auth and monitoring
}
```

## Service Organization Rules

1. File Structure
```
src/
  core/
    filesystem/
    config/
    logging/
  business/
    agent/
    prompt/
    skill/
  infrastructure/
    database/
    messaging/
    http/
  cross-cutting/
    auth/
    monitoring/
    validation/
```

2. Naming Conventions
- Services: PascalCase with 'Service' suffix
- Directories: kebab-case
- Files: kebab-case
- Interfaces: PascalCase with 'Api' suffix

3. Documentation Requirements
- Service purpose and responsibility
- Dependencies and their justification
- Configuration requirements
- Error handling approach
- Usage examples

## Anti-patterns to Avoid

1. Layer Violations
```typescript
// DON'T: Skip layers
class BusinessService {
  constructor(
    private readonly database: DatabaseService // WRONG! Should use repository
  ) {}
}
```

2. Circular Dependencies
```typescript
// DON'T: Create circular references
interface ServiceA extends ServiceB {}
interface ServiceB extends ServiceA {} // WRONG!
```

3. Mixed Responsibilities
```typescript
// DON'T: Mix concerns
class UserService {
  // WRONG! Separate into different services
  async authenticateUser() {}
  async updateUserProfile() {}
  async sendUserEmail() {}
}
```

## Service Implementation Checklist

- [ ] Service placed in correct layer
- [ ] Dependencies follow layer rules
- [ ] Cross-cutting concerns properly utilized
- [ ] Error handling implemented
- [ ] Monitoring integrated
- [ ] Documentation complete
- [ ] Tests written
- [ ] Configuration externalized
- [ ] Proper error types defined
- [ ] Layer-appropriate interfaces exposed 