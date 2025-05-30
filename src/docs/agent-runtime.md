# AgentRuntime Design Document

## 1. Introduction

**`AgentRuntime`** is the central orchestrator for the Effective Agent application. It is responsible for bootstrapping the application, initializing all core services, managing their dependencies, and providing a consistent `Effect.Runtime` for executing application logic.

Its primary goals are:
- To establish a single, well-defined entry point for application initialization.
- To manage the lifecycle and dependencies of core services in a structured manner.
- To provide a unified and properly configured `Effect.Runtime` context for all operations.
- To encapsulate the complexity of dependency injection setup using Effect Layers.

## 2. Core Responsibilities

- **Application Bootstrapping:** Manages the initial startup sequence of the application.
- **Service Initialization:** Initializes core services such as `FileSystem`, `ConfigurationService`, `LoggingService`, `ProviderService`, `ModelService`, `PolicyService`, and potentially others like `AuthService`.
- **Dependency Management:** Composes and provides the necessary Effect Layers for all services, ensuring that dependencies are correctly resolved and injected. Services access their dependencies via `yield* ServiceName`.
- **Runtime Provision:** Creates and exposes a singleton `Effect.Runtime` instance that includes the context of all initialized services (`AppDependencyLayer`).
- **Execution Context:** Offers methods (`runPromise`, `runFork`) to execute Effect-based operations within the application's fully configured runtime context.

## 3. Initialization Process (`AgentRuntime.initialize()`)

The `AgentRuntime.initialize()` static method is the sole entry point for setting up the application environment. It follows these steps:

1.  **Determine Master Configuration Path:**
    *   Reads the `EFFECTIVE_AGENT_MASTER_CONFIG` environment variable.
    *   If the environment variable is not set, it defaults to a predefined path (e.g., `./master-config.json`).

2.  **Load and Validate Master Configuration:**
    *   A dedicated bootstrap Effect, `loadMasterConfigEffect(filePath)`, is used.
    *   This effect is provided with a hardcoded `FileSystem` implementation (e.g., `NodeFileSystem.layer`) specifically for this initial loading task, ensuring independence from the application's configurable `FileSystem`.
    *   The content of `master-config.json` is read, parsed, and validated against `MasterConfigSchema`.
    *   Errors during this phase (file not found, parse error, schema validation error) are handled via a `BootstrapError`.

3.  **Create `MasterConfigData` Layer:**
    *   The validated `MasterConfigSchema` data (referred to as `masterConfig`) is wrapped in an Effect Layer: `Layer.succeed(MasterConfigData, masterConfig)`.
    *   `MasterConfigData` is a `Context.Tag<MasterConfigSchema>` used to provide the raw, validated master configuration data to services that need it, primarily the `ConfigurationService`.

4.  **Select Application `FileSystem` Layer:**
    *   Based on the `runtimeSettings.fileSystemImplementation` value in the `masterConfig` (e.g., "node" or "bun"), the appropriate `FileSystem` layer (e.g., `NodeFileSystem.layer` or `BunFileSystem.layer`) is selected for the main application. This is referred to as `appFileSystemLayer`.

5.  **Instantiate `ConfigurationService` Layer:**
    *   The `ConfigurationService.Default` layer (from `Effect.Service`) is used.
    *   It is provided with the `masterConfigDataLayer` to give `ConfigurationService` access to the master configuration data.
    *   `ConfigurationService` will also implicitly depend on the `appFileSystemLayer` being available in the final merged context.

6.  **Instantiate Other Core Service Layers:**
    *   Default layers (`ServiceName.Default`) for other core services (`LoggingService`, `ProviderService`, `ModelService`, `PolicyService`, etc.) are prepared.
    *   These services typically depend on `ConfigurationService` (to fetch their specific configurations) and potentially other services. Dependencies are resolved via `yield* ServiceName` within their `Effect.Service` definitions.

7.  **Compose `AppDependencyLayer`:**
    *   All individual service layers and data layers are merged into a single `AppDependencyLayer` using `Layer.mergeAll(...)`. This layer includes:
        *   `appFileSystemLayer`
        *   `masterConfigDataLayer`
        *   `configurationServiceLayer` (which is `ConfigurationService.Default` provisioned with `MasterConfigData`)
        *   `LoggingService.Default`
        *   `ProviderService.Default`
        *   `ModelService.Default`
        *   `PolicyService.Default`
        *   And any other application-wide services.

8.  **Create `Effect.Runtime`:**
    *   The `AppDependencyLayer` is converted into an `Effect.Runtime` using `Layer.toRuntime(AppDependencyLayer)`. This runtime (`effectRuntime`) now contains the complete context required by the application.

9.  **Singleton Instance:**
    *   The `AgentRuntime` class manages a private static `_instance` and a private constructor. `initialize()` creates and stores this instance, ensuring only one `AgentRuntime` exists.

10. **Initial Log:**
    *   An initial log message is emitted using the newly configured `LoggingService` to confirm successful initialization.

## 4. Usage

The `AgentRuntime` is intended to be initialized once at the application's entry point.

```typescript
// main.ts (or equivalent entry point)
import { AgentRuntime } from '@/agent-runtime';
import { Effect } from 'effect';
import { MyMainAppLogicService } from '@/services/app/my-main-app-logic-service'; // Example

async function main() {
  try {
    const runtime = await AgentRuntime.initialize();

    // Example of running an effect using the runtime
    const result = await runtime.runPromise(
      Effect.gen(function*() {
        const appLogic = yield* MyMainAppLogicService;
        return yield* appLogic.run();
      })
    );
    console.log("Application finished with result:", result);

  } catch (error) {
    console.error("Application failed to initialize or run:", error);
    process.exit(1);
  }
}

main();
```

Services obtain their dependencies via `yield* ServiceName` within their `Effect.Service` definition. The `AgentRuntime` ensures these services are available in the runtime context.

## 5. Key Services Managed/Provided

The `AgentRuntime` ensures the following services (among others) are initialized and available in the application context:

-   **`FileSystem`**: An implementation of `@effect/platform` (Node or Bun).
-   **`MasterConfigData`**: The raw, validated data from `master-config.json`.
-   **`ConfigurationService`**: For accessing all other application configurations.
-   **`LoggingService`**: For application-wide logging.
-   **`ProviderService`**: For managing AI provider clients and API keys.
-   **`ModelService`**: For managing AI model definitions and capabilities.
-   **`PolicyService`**: For enforcing application policies.
-   *(Optional)* **`AuthService`**: For handling authentication.

## 6. Configuration

-   **`master-config.json`**: The root configuration file. Its location is determined by the `EFFECTIVE_AGENT_MASTER_CONFIG` environment variable or a default path. It defines:
    *   Paths to other configuration files (providers, models, policy).
    *   Runtime settings (e.g., `fileSystemImplementation`).
    *   Logging settings.
    *   Authentication settings (if applicable).
-   **`EFFECTIVE_AGENT_MASTER_CONFIG` (Environment Variable)**: Specifies the path to `master-config.json`.

## 7. Error Handling during Initialization

-   If `master-config.json` cannot be loaded or validated, `AgentRuntime.initialize()` will throw a `BootstrapError`, preventing the application from starting.
-   Failures in initializing other services (e.g., a critical configuration file pointed to by `master-config.json` is missing or invalid) will also cause `initialize()` to fail, typically propagating the error from the failing service's layer construction.

## 8. Architectural Adherence

-   **`Effect.Service` Pattern**: All services are implemented using the `Effect.Service` pattern.
-   **Dependency Injection**: Services declare dependencies via `yield* ServiceName`. The `AgentRuntime` sets up the necessary layers for this to work.
-   **Layer Usage**: Effect Layers (`Layer.succeed`, `Layer.provide`, `Layer.mergeAll`, `Layer.toRuntime`) are used internally by `AgentRuntime.initialize()` for setting up the DI context. This is considered the "setup phase" and is distinct from how services interact with each other at runtime.
-   **`Context.Tag` for Data**: `Context.Tag` (e.g., `MasterConfigData`) is used for providing typed, validated configuration *data* within the Layer system, which is distinct from using Tags for service identification.

## 9. Future Considerations

-   **Dynamic Configuration Reloading**: Explore mechanisms to allow reloading of certain configurations without restarting the entire application.
-   **Service Health Checks**: Integrate a mechanism for services to report their health status, which `AgentRuntime` could expose.

## 10. Implementation Plan

This section outlines the steps to implement the `AgentRuntime` as described in this document.

**Phase 1: Prerequisites and Core Definitions**

1.  **Project Setup & Dependencies:**
    *   Verify that `effect`, `@effect/platform-node`, and (if applicable) `@effect/platform-bun` are correctly installed and configured in `package.json` and `tsconfig.json`.
    *   Action: Review `package.json` and `tsconfig.json`.

2.  **Define `master-config.json` Structure and Location:**
    *   Create the `master-config.json` file at `/Users/paul/Projects/EffectiveAgent/config/master-config.json`.
    *   Content should include:
        ```json
        {
          "version": "1.0.0",
          "runtimeSettings": {
            "fileSystemImplementation": "node"
          },
          "logging": {
            "level": "info",
            "filePath": "./logs/app.log"
          },
          "configPaths": {
            "providers": "./config/providers.json",
            "models": "./config/models.json",
            "policy": "./config/policy.json"
          }
        }
        ```
    *   Action: Create `/Users/paul/Projects/EffectiveAgent/config/master-config.json`.

3.  **Define `MasterConfigSchema`:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/core/config/master-config-schema.ts` (New proposed location for core/global schemas).
    *   Action:
        *   Create the directory `src/core/config/` if it doesn't exist.
        *   Define `RuntimeSettingsSchema`, `LoggingSettingsSchema`, `ConfigPathsSchema` in this file.
        *   Define `MasterConfigSchema` incorporating the above.
        *   *Note: Schemas for providers, models, policy will be defined within their respective service directories (e.g., `src/services/ai/provider/schema.ts`).*

4.  **Define `MasterConfigData` Tag:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts` (or `/Users/paul/Projects/EffectiveAgent/src/core/config/master-config-data.ts`).
    *   Action: Add `export const MasterConfigData = Context.Tag<MasterConfigSchema>();` (importing `MasterConfigSchema` from its new location).

5.  **Define `BootstrapError`:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts` (or a shared error file like `/Users/paul/Projects/EffectiveAgent/src/core/errors.ts`).
    *   Action: Add `export class BootstrapError extends Data.TaggedError("BootstrapError")<{ message: string; cause?: unknown; }> {}`.

**Phase 2: `AgentRuntime` Implementation**

6.  **Implement `loadMasterConfigEffect` Helper:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts`
    *   Action:
        *   Create the static helper function `loadMasterConfigEffect(filePath: string): Effect.Effect<MasterConfigSchema, BootstrapError, FileSystem>`.
        *   Import `MasterConfigSchema` from `/Users/paul/Projects/EffectiveAgent/src/core/config/master-config-schema.ts`.
        *   Implement logic using `yield* FileSystem`, `fs.readFileString`, `JSON.parse`, and `Schema.decode(MasterConfigSchema)`.
        *   Map errors to `BootstrapError`.

7.  **Implement `AgentRuntime` Class Shell:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts`
    *   Action:
        *   Define `export class AgentRuntime`.
        *   Add `private static _instance: AgentRuntime | undefined;`.
        *   Add `public readonly effectRuntime: Runtime.Runtime<any>;`.
        *   Add `private constructor(runtime: Runtime.Runtime<any>)`.
        *   Add `public static async initialize(): Promise<AgentRuntime> { /* ... to be filled ... */ }`.
        *   Add `public runPromise = <E, A, R>(...) => { ... }`.
        *   Add `public runFork = <E, A, R>(...) => { ... }`.

8.  **Implement `AgentRuntime.initialize()` - Steps 1-4 (Bootstrap & FS Selection):**
    *   Location: Inside `AgentRuntime.initialize()` in `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts`.
    *   Action:
        *   **Step 1 (Master Config Path):** Use `Config.string("EFFECTIVE_AGENT_MASTER_CONFIG")`, `Effect.orElse(() => Effect.succeed("./config/master-config.json"))` (updated default path), `Effect.runPromise`.
        *   **Step 2 (Load Master Config):** Call `loadMasterConfigEffect`, provide `NodeFileSystem.layer` (import from `@effect/platform-node`), and run with `Effect.runPromise`.
        *   **Step 3 (`MasterConfigData` Layer):** `Layer.succeed(MasterConfigData, masterConfig)`.
        *   **Step 4 (App `FileSystem` Layer):**
            *   Import `NodeFileSystem` from `@effect/platform-node`.
            *   Import `BunFileSystem` from `@effect/platform-bun`.
            *   Implement conditional logic based on `masterConfig.runtimeSettings.fileSystemImplementation` to select `appFileSystemLayer`.

**Phase 3: Service Integration & Layer Composition**

9.  **Define Service-Specific Config Schemas and Update Services:**
    *   For services like `ProviderService`, `ModelService`, `PolicyService`:
        *   Location: e.g., `/Users/paul/Projects/EffectiveAgent/src/services/ai/provider/schema.ts`
        *   Action: Define the schema for their respective config files (e.g., `ProvidersConfigSchema` for `providers.json`).
    *   Update `ConfigurationService` (`/Users/paul/Projects/EffectiveAgent/src/services/core/configuration/service.ts`):
        *   Modify its `loadAndCache` (or equivalent) methods to import and use these co-located schemas when validating `providers.json`, `models.json`, etc.
        *   The file `/Users/paul/Projects/EffectiveAgent/src/services/core/configuration/schema.ts` might be removed or significantly reduced if all its specific schemas are moved.

10. **Ensure Core Service Stubs & `.Default` Layers:**
    *   For each service (`ConfigurationService`, `LoggingService`, `ProviderService`, `ModelService`, `PolicyService`):
        *   Location: Their respective `service.ts` files.
        *   Action:
            *   Verify/Create the class extending `Effect.Service<ApiInterface>()("ServiceName", { effect: Effect.gen(...), dependencies: [...] })`.
            *   Ensure each service exports its default layer.
            *   `ConfigurationService` will use `yield* MasterConfigData` (provided via `masterConfigDataLayer` to its own layer factory) and the co-located schemas for specific configs.
            *   Other services list `ConfigurationService.Default` (and others as needed) in their `dependencies` array.

11. **Implement `AgentRuntime.initialize()` - Steps 5-10 (Layer Composition & Runtime Creation):**
    *   Location: Inside `AgentRuntime.initialize()` in `/Users/paul/Projects/EffectiveAgent/src/agent-runtime.ts`.
    *   Action:
        *   **Step 5 (`ConfigurationService` Layer):** `const configurationServiceLayer = Layer.provide(ConfigurationService.Default, masterConfigDataLayer);`.
        *   **Step 6 (Other Service Layers):** Reference `LoggingService.Default`, `ProviderService.Default`, etc.
        *   **Step 7 (`AppDependencyLayer`):** `Layer.mergeAll(...)` with `appFileSystemLayer`, `masterConfigDataLayer`, `configurationServiceLayer`, and other `.Default` service layers.
        *   **Step 8 (Create `Effect.Runtime`):** `Layer.toRuntime(AppDependencyLayer)`.
        *   **Step 9 (Singleton Instance):** `AgentRuntime._instance = new AgentRuntime(runtimeContext);`.
        *   **Step 10 (Initial Log):** Implement the logging call using `AgentRuntime._instance.runPromise` and `yield* LoggingService`.

**Phase 4: Entry Point and Initial Testing**

12. **Create/Update `main.ts` Entry Point:**
    *   Location: `/Users/paul/Projects/EffectiveAgent/src/main.ts` (or equivalent).
    *   Action:
        *   Implement the `async function main()` as described in the design document.
        *   Call `AgentRuntime.initialize()`.
        *   Include a simple test Effect to run using `runtime.runPromise(...)`.

13. **Initial Test Run & Debugging:**
    *   Action:
        *   Execute `bun src/main.ts` (or `node dist/main.js` after compilation).
        *   Address any errors.

## 11. Refactoring Plan for Existing Services

This section outlines the necessary refactoring steps for existing services to integrate with the `AgentRuntime` and adhere to the new architectural patterns, including centralized configuration management and co-located schemas.

**A. General Principles for Refactoring:**

1.  **Dependency Injection:** All services must acquire their dependencies (other services, `FileSystem`, `MasterConfigData`) by `yield* ServiceName` within their `Effect.Service` definition. Dependencies will be provided by the `AppDependencyLayer` managed by `AgentRuntime`.
2.  **Configuration Access:** Services requiring configuration data (beyond `MasterConfigData`) must depend on `ConfigurationService` and use its methods to retrieve their specific, validated configurations.
3.  **Schema Co-location:** Schemas for service-specific configuration files (e.g., `providers.json`, `models.json`) should be moved from a central `core/configuration/schema.ts` to a `schema.ts` file within their respective service's directory (e.g., `src/services/ai/provider/schema.ts`).
4.  **Eliminate Direct Config/FS Access:** Services should no longer directly read configuration files from the filesystem or access environment variables for configuration purposes (except for `ConfigurationService` itself, which handles API keys and `MasterConfigData`).
5.  **Service API Consistency:** Ensure service APIs (`api.ts`) and implementations (`service.ts`) are consistent with the `Effect.Service` pattern and clearly define their contracts.

**B. Service-Specific Refactoring Steps:**

**1. `ConfigurationService` (`src/services/core/configuration/`)**

*   **Dependencies:**
    *   Ensure it correctly depends on `FileSystem` (provided by `AgentRuntime`).
    *   It will receive `MasterConfigData` via the `Layer.provide(ConfigurationService.Default, masterConfigDataLayer)` mechanism in `AgentRuntime.initialize()`. Update its `effect` block to `yield* MasterConfigData`.
*   **Schema Management:**
    *   The `src/services/core/configuration/schema.ts` file should be removed or significantly reduced. Its primary responsibility will shift to the new `src/core/config/master-config-schema.ts` (for `MasterConfigSchema`) and individual service schema files.
*   **Configuration Loading Methods (e.g., `getProvidersConfig`, `getModelsConfig`, `getPolicyConfig`):**
    *   Modify these methods to:
        1.  Retrieve the relevant file path from the `masterConfig.configPaths` (obtained from `yield* MasterConfigData`).
        2.  Use the injected `FileSystem` (`yield* FileSystem`) to read the file content.
        3.  Import the specific schema (e.g., `ProviderConfigSchema`) from the service's co-located schema file (e.g., `src/services/ai/provider/schema.ts`).
        4.  Parse and validate the content against this imported schema.
        5.  Return the validated configuration data.
*   **API Key Management (`getApiKey`):**
    *   This method should remain, using `Config.secret(envVarName)` to securely fetch API keys from environment variables.
*   **Environment Variable Access (`getEnvVariable`):**
    *   This general method for accessing environment variables should also remain.

**2. `LoggingService` (`src/services/core/logging/`)**

*   **Dependencies:**
    *   Add `ConfigurationService.Default` to its `dependencies` array.
*   **Configuration:**
    *   In its `effect` block, `yield* ConfigurationService` to get an instance.
    *   Call a method on `ConfigurationService` that retrieves the logging settings from `MasterConfigData.logging` (e.g., `configService.getMasterConfig().pipe(Effect.map(mc => mc.logging))`).
    *   Initialize its underlying logger (e.g., Winston, or Effect's `Logger.set`) based on these fetched settings (`filePath`, `level`).
*   **Eliminate Direct Config:** Remove any hardcoded logging settings or direct reading of configuration files/environment variables for logging setup.

**3. `ProviderService` (`src/services/ai/provider/`)**

*   **Schema Co-location:**
    *   Create `src/services/ai/provider/schema.ts`.
    *   Move the `Schema.Class` definitions relevant to `providers.json` (e.g., `ProviderDefinitionSchema`, `ProvidersConfigSchema`) into this new file.
*   **Dependencies:**
    *   Add `ConfigurationService.Default` to its `dependencies` array.
*   **Configuration Loading:**
    *   In its `effect` block, `yield* ConfigurationService`.
    *   Call `configService.getProvidersConfig()` to get the validated array of provider definitions. This method in `ConfigurationService` will internally handle reading `providers.json` (path from `MasterConfigData`) and validating it with `src/services/ai/provider/schema.ts`.
*   **API Key Fetching:**
    *   For each provider requiring an API key, use `configService.getApiKey(provider.apiKeyEnvVar)` to retrieve the key.
*   **Eliminate Direct Access:**
    *   Remove any direct `FileSystem` usage for reading `providers.json`.
    *   Remove any direct `Config.secret` or `process.env` access for API keys.

**4. `ModelService` (`src/services/ai/model/`)**

*   **Schema Co-location:**
    *   Create `src/services/ai/model/schema.ts`.
    *   Move the `Schema.Class` definitions relevant to `models.json` (e.g., `ModelDefinitionSchema`, `ModelsConfigFileSchema`) into this new file.
*   **Dependencies:**
    *   Add `ConfigurationService.Default` and `ProviderService.Default` to its `dependencies` array.
*   **Configuration Loading:**
    *   In its `effect` block, `yield* ConfigurationService`.
    *   Call `configService.getModelsConfig()` to get the validated model definitions.
*   **Provider Interaction:**
    *   Use the injected `ProviderService` (`yield* ProviderService`) to check the availability or capabilities of providers listed in model definitions.
*   **Eliminate Direct Access:**
    *   Remove any direct `FileSystem` usage for reading `models.json`.

**5. `PolicyService` (`src/services/ai/policy/`)**

*   **Schema Co-location:**
    *   Create `src/services/ai/policy/schema.ts`.
    *   Move/Define `Schema.Class` definitions relevant to `policy.json` (e.g., `PolicyRuleSchema`, `PolicyConfigFileSchema`) into this new file.
*   **Dependencies:**
    *   Add `ConfigurationService.Default` to its `dependencies` array.
*   **Configuration Loading:**
    *   In its `effect` block, `yield* ConfigurationService`.
    *   Call `configService.getPolicyConfig()` to get the validated policy rules.
*   **Eliminate Direct Access:**
    *   Remove any direct `FileSystem` usage for reading `policy.json`.

**C. Application Entry Point (`src/main.ts`)**

*   Ensure `main.ts` (or the primary application entry point) is updated to:
    1.  Call `AgentRuntime.initialize()` as the first step.
    2.  Use the `effectRuntime` instance returned by `AgentRuntime` to execute the main application logic (e.g., `runtime.runPromise(myAppEffect)`).
    3.  Remove any manual layer creation or service instantiation previously done in `main.ts`.

**D. Testing Strategy**

*   **Unit Tests:**
    *   For services like `ProviderService`, `ModelService`, etc., when testing their core logic, mock the `ConfigurationService` (or other direct dependencies) they `yield*`. This can be done by creating a test-specific layer for the mocked service and providing it in the test's Effect pipeline.
    *   Example: `myServiceLogicEffect.pipe(Effect.provide(TestConfigurationServiceLayer))`
*   **Integration Tests:**
    *   Tests that involve the interaction of multiple services up to `AgentRuntime` can be constructed by running effects using the `effectRuntime` from a test-initialized `AgentRuntime`. This might involve setting a specific `EFFECTIVE_AGENT_MASTER_CONFIG` environment variable pointing to a test `master-config.json`.
*   **`ConfigurationService` Tests:**
    *   Test `ConfigurationService` by providing it with a `TestFileSystemLayer` (that serves mock file content) and a `TestMasterConfigDataLayer`.

This refactoring will align all services with the centralized `AgentRuntime`, streamline configuration management, and improve adherence to the chosen architectural patterns.


