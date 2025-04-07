# Open Issues for Core Storage Service

1.  **Abstract Storage API:**
    *   **Issue:** The current `core/storage/file` service implements a concrete file system storage API directly. Ideally, `core/storage` could define a more abstract `StorageApi` interface (using keys/blobs instead of file paths) to allow for different backend implementations (e.g., S3, in-memory) via dependency injection.
    *   **Decision:** Deferred for now. The concrete `FileStorageApi` meets immediate needs.
    *   **Action:** If other storage backends are required later, refactor to introduce the abstract `StorageApi` in `core/storage/types.ts` and update `core/storage/file` to implement it. (Tracked: 2024-07-28)
