# Core Services Overview

**Version:** 1.0
**Date:** 2024-07-27

This document provides a high-level overview of the foundational services located within the `src/services/core/` directory of the EffectiveAgent framework. These services provide essential, cross-cutting functionalities utilized by other service categories (AI, Capabilities, Execution, Memory).

## Guiding Principles

*   **Modularity:** Each core service has a distinct responsibility.
*   **Abstraction:** Services hide implementation details behind clear Effect-based interfaces (APIs defined via Tags).
*   **Composability:** Services are designed to be composed using Effect Layers for dependency injection.
*   **Testability:** Interfaces allow for mocking or providing test doubles.

## Core Service Categories

### 1. `loader` (Entity/Configuration Loading)

*   **Purpose:** Provides a single, generic API (`EntityLoaderApi`) for loading data from configuration files (e.g., JSON, YAML). It handles resolving file paths (relative to a configured `basePath`), reading file content, parsing the content, and validating it against a provided Zod schema.
*   **Key Responsibility:** Abstracting file system access and validation for configuration/definition files used by other services (like Skill, Persona, Intelligence configurations).
*   **Dependencies:** `FileSystem`, `Path`, `ConfigLoaderOptions` (for `basePath`).
*   **Primary Consumer:** Configuration services in other modules (e.g., `SkillConfiguration`, `PersonaConfiguration`).

### 2. `logging`

*   **Purpose:** Offers a standardized facade (`LoggingApi`) over Effect's built-in logging system. Ensures consistent logging practices across the framework.
*   **Key Responsibility:** Providing familiar logging methods (`debug`, `info`, `warn`, `error`, `logCause`) that delegate to the underlying Effect `Logger`. Supports structured logging context. Allows configuration of log levels via Layers.
*   **Dependencies:** None directly (uses `Logger` from Effect context).
*   **Primary Consumer:** All other services requiring logging capabilities.

### 3. `repository`

*   **Purpose:** Defines the generic abstraction (`RepositoryApi<TEntity>`) for structured data persistence (CRUD, basic querying). Provides concrete implementations for different storage backends.
*   **Key Responsibility:** Decoupling domain logic from specific database technologies. Defines the `BaseEntity` structure (ID, timestamps, data).
*   **Implementations:**
    *   `in-memory`: For testing and simple use cases (uses `Ref<Map>`).
    *   `(Future)` `drizzle-sqlite`: For SQLite persistence via Drizzle ORM.
    *   `(Future)` `drizzle-postgres`: For PostgreSQL persistence via Drizzle ORM.
*   **Dependencies:** Implementations depend on underlying drivers/clients (`Clock` for in-memory, Drizzle instance/DB connection for others).
*   **Primary Consumer:** Services needing to persist or retrieve structured domain entities (e.g., `ThreadApi`, `AttachmentApi`, `TagApi`, configuration services if storing definitions in DB).

### 4. `storage` (Raw Data Storage)

*   **Purpose:** Manages the persistence and retrieval of raw binary data (files, blobs), distinct from structured entity data handled by `repository`.
*   **Key Responsibility:** Abstracting the underlying storage mechanism (filesystem, S3, etc.) for raw data. Provides an API (`FileStorageApi` in `storage/file/`) for uploading, downloading, and deleting data blobs identified by a unique ID (`fileId`).
*   **Implementations:**
    *   `storage/file`: Uses the local filesystem (via `BunFileSystem`).
    *   `(Future)` `storage/s3`: For AWS S3 storage.
*   **Dependencies:** `FileSystem`, `Path`, configuration for storage details (e.g., base path, bucket name).
*   **Primary Consumer:** Services dealing with user uploads or potentially large AI-generated binary artifacts (e.g., images, audio), and the `Attachment` service (to link stored files).

### 5. `attachment`

*   **Purpose:** Manages the **link** or association between a persisted domain entity (e.g., a Thread identified by `threadId`) and a raw data file stored via the `storage` service (identified by `fileId`).
*   **Key Responsibility:** Creating, deleting, and querying these many-to-many relationships. It does *not* handle the file bytes themselves.
*   **Dependencies:** `RepositoryApi` (to store the link entities, e.g., in an `attachments` table), `LoggingApi`.
*   **Primary Consumer:** Services that need to associate files with other objects (e.g., `ThreadApi`, potentially message handling logic).

### 6. `tag`

*   **Purpose:** Manages the association of simple string tags with **persisted** domain entities (e.g., Threads, Skills) for categorization and filtering.
*   **Key Responsibility:** Creating, deleting, and querying tag associations using a many-to-many mapping structure (likely via `RepositoryApi`). Provides methods like `tagEntity`, `getTagsForEntity`, `getEntitiesByTags`.
*   **Dependencies:** `RepositoryApi` (to store tag definitions and links), `LoggingApi`.
*   **Primary Consumer:** Services needing to categorize or filter persisted entities (e.g., Agent management UI, potentially internal logic).

This set of core services provides the essential infrastructure for configuration loading, logging, data persistence (structured and raw), and metadata management (attachments, tags) needed by the higher-level components of the EffectiveAgent framework.
