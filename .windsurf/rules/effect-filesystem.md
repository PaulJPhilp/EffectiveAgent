---
trigger: model_decision
description: Patterns for using FileSystem with Effect
globs: **/*.ts
---
# Effect FileSystem Patterns

## Basic Setup
```typescript
import { FileSystem } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Effect } from "effect"
```

## Core Pattern
Always use the FileSystem service through Effect.gen and provide NodeContext.layer:

```typescript
const program = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    // Use fs for operations
})

// Run with NodeContext
await Effect.runPromise(
    program.pipe(
        Effect.provide(NodeContext.layer)
    )
)
```

## Common Operations

### Check File Existence
```typescript
const exists = yield* fs.exists("./path/to/file")
```

### Read/Write Files
```typescript
// Write
yield* fs.writeFileString("./file.txt", content)

// Read
const content = yield* fs.readFileString("./file.txt", "utf8")
```

### Directory Operations
```typescript
// Create
yield* fs.makeDirectory("./dir")

// Remove (with recursive option for non-empty directories)
yield* fs.remove("./dir", { recursive: true })
```

## Best Practices

1. Always provide NodeContext.layer when running FileSystem operations
2. Use recursive: true when removing directories that might not be empty
3. Clean up test files/directories after tests
4. Handle errors appropriately using Effect's error channel
5. Use relative paths starting with "./" for clarity

## Testing Pattern
```typescript
describe("FileSystem Example", () => {
    it("should perform file operations", async () => {
        const program = Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem
            // Perform operations
            // Clean up after test
        })

        const result = await Effect.runPromise(
            program.pipe(
                Effect.provide(NodeContext.layer)
            )
        )
        // Assert results
    })
})
```

## Anti-patterns to Avoid

1. Don't use Node's fs module directly - use Effect's FileSystem
2. Don't forget to provide NodeContext.layer
3. Don't leave test files/directories uncleaned
4. Don't use absolute paths in tests
5. Don't mix Promise-based fs operations with Effect 