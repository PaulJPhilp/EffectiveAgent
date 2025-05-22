---
trigger: always_on
description: 
globs: 
---
## Effect Layer Composition Rule
- Always use Layer instances (not service tags or service objects) when composing or providing dependencies with Layer.merge, Layer.provide, or similar functions. For example, use Layer.merge(ModelService.Live, ProviderService.Live), not Layer.merge(ModelService, ProviderService). 

## Effect Service Anti-patterns
- Never export `.Live` or `.Default` layers direclty from `service.ts` files. Only export the `Effect.Service` class from `service.ts`. Any other export (such as `.Live` or `.Default`) is a code smell and an anti-pattern. 

## Biome Rules
- Never import or use `Tag` from `effect`. Using `Tag` is forbidden in all code, including tests and mocks. 

## Mocking Rules
- Never mock external services (such as HTTP clients, databases, or third-party APIs). Always use real in-memory or test implementations for integration and system tests. 