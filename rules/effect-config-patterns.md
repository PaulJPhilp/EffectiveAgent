# Effect Configuration Patterns

## Core Configuration Patterns

### Environment Configuration
```typescript
// config.ts
import * as Config from "@effect/io/Config"

export interface AppConfig {
  readonly port: number
  readonly apiKey: string
  readonly debug: boolean
}

export const AppConfigSchema = Config.struct({
  port: Config.number("PORT"),
  apiKey: Config.secret("API_KEY"),
  debug: Config.boolean("DEBUG")
})

// layer.ts
export const AppConfigLive = Layer.effect(
  AppConfigTag,
  Effect.config(AppConfigSchema)
)
```

### JSON Configuration Files
```typescript
// schema.ts
export const ConfigFileSchema = Schema.struct({
  version: Schema.string,
  settings: Schema.struct({
    timeout: Schema.number,
    retries: Schema.number
  })
})

// service.ts
export class ConfigServiceLive implements ConfigService {
  constructor(
    private readonly fs: FileSystem,
    private readonly configPath: string
  ) {}

  readonly loadConfig = Effect.gen(function* (_) {
    const content = yield* this.fs.readFileString(this.configPath)
    const parsed = JSON.parse(content)
    return yield* Schema.parse(ConfigFileSchema)(parsed)
  })
}

export const ConfigServiceLive = Layer.effect(
  ConfigServiceTag,
  Effect.map(
    Effect.all([FileSystem, ConfigPathTag]),
    ([fs, path]) => new ConfigServiceLive(fs, path)
  )
)
```

## Configuration Loading Patterns

### Layered Configuration
```typescript
// Combine multiple config sources
const AppConfig = Layer.provide(
  ServiceConfigLive,
  Layer.merge(
    EnvConfigLive,
    FileConfigLive
  )
)

// Override configurations
const TestConfig = Layer.provide(
  ServiceConfigLive,
  Layer.succeed(
    ConfigTag,
    { /* test config */ }
  )
)
```

### Dynamic Configuration
```typescript
export class DynamicConfigService {
  constructor(private readonly watcher: FileWatcher) {}

  readonly watchConfig = Effect.gen(function* (_) {
    const events = yield* this.watcher.watch(configPath)
    return yield* Effect.forEach(events, (event) =>
      Effect.when(
        this.reloadConfig(),
        () => event.type === "change"
      )
    )
  })

  private readonly reloadConfig = Effect.gen(function* (_) {
    const newConfig = yield* this.loadConfig()
    yield* this.updateConfig(newConfig)
  })
}
```

## Validation Patterns

### Schema Validation
```typescript
export const ServiceConfigSchema = Schema.struct({
  name: Schema.string,
  version: Schema.string,
  settings: Schema.struct({
    timeout: Schema.number.pipe(
      Schema.positive(),
      Schema.int()
    ),
    retries: Schema.number.pipe(
      Schema.between(1, 5)
    )
  })
}).pipe(
  Schema.message("Invalid service configuration")
)

const validateConfig = (config: unknown) =>
  Effect.gen(function* (_) {
    return yield* Schema.parse(ServiceConfigSchema)(config).pipe(
      Effect.mapError((error) => new ConfigValidationError({
        message: "Configuration validation failed",
        cause: error
      }))
    )
  })
```

### Runtime Validation
```typescript
const validateRuntime = (config: Config) =>
  Effect.gen(function* (_) {
    // Check dependencies
    yield* validateDependencies(config.dependencies)
    
    // Verify connections
    yield* validateConnections(config.connections)
    
    // Test required services
    yield* validateServices(config.services)
    
    return config
  })

const loadAndValidateConfig = Effect.gen(function* (_) {
  const config = yield* loadConfig()
  const validated = yield* validateConfig(config)
  return yield* validateRuntime(validated)
})
```

## Error Handling

### Configuration Errors
```typescript
export class ConfigLoadError extends Data.TaggedError("ConfigLoadError")<{
  readonly path: string
  readonly cause: Error
}> {}

export class ConfigValidationError extends Data.TaggedError("ConfigValidationError")<{
  readonly message: string
  readonly cause: Error
}> {}

export class ConfigUpdateError extends Data.TaggedError("ConfigUpdateError")<{
  readonly message: string
  readonly cause: Error
}> {}
```

### Error Recovery
```typescript
const loadConfigWithFallback = Effect.gen(function* (_) {
  const config = yield* loadConfig().pipe(
    Effect.catchTag("ConfigLoadError", (error) =>
      Effect.succeed(defaultConfig)
    )
  )
  return config
})

const validateConfigSafely = (config: unknown) =>
  Effect.gen(function* (_) {
    const validated = yield* validateConfig(config).pipe(
      Effect.catchTag("ConfigValidationError", (error) => {
        yield* LoggerService.warn("Config validation failed, using defaults", error)
        return Effect.succeed(defaultConfig)
      })
    )
    return validated
  })
```

## Best Practices

1. **Configuration Design**
   - Use strongly typed configurations
   - Validate at load time
   - Keep configurations immutable
   - Use proper secret management

2. **Validation**
   - Validate schema and runtime
   - Provide clear error messages
   - Use proper type guards
   - Handle all edge cases

3. **Error Handling**
   - Define specific error types
   - Provide fallback values
   - Log validation failures
   - Handle missing configurations

4. **Security**
   - Use secrets for sensitive data
   - Validate all inputs
   - Sanitize configuration data
   - Handle permissions properly

## Anti-patterns to Avoid

1. **DO NOT**
   - Use untyped configurations
   - Skip validation
   - Ignore error cases
   - Mix config and business logic

2. **NEVER**
   - Store secrets in plain text
   - Use hardcoded configurations
   - Ignore validation errors
   - Share mutable configurations 