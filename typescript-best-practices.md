# TypeScript Best Practices

## Type System
// ... existing code ...

## Spread Operator Type Safety
- Use `Parameters<typeof functionName>` for typing spread arguments
- Apply type assertions when slicing argument arrays
- Avoid raw spread of untyped arrays
- Ensure spread arguments match function parameter types

// ... existing code ... 