# @effective/effector

A TypeScript library for building actor-model based agents using Effect.

## Installation

```bash
bun add @effective/effector
```

## Usage

```typescript
import { Effect } from "effect"
import { EffectorService, type Effector, type EffectorId } from "@effective/effector"

// Create an effector
const createMyEffector = (id: EffectorId): Effect.Effect<Effector> =>
  Effect.gen(function* () {
    const service = yield* EffectorService
    return yield* service.create(id, initialState)
  })

// Use the effector
const program = Effect.gen(function* () {
  const effector = yield* createMyEffector("my-effector")
  yield* effector.send({ type: "COMMAND", payload: { /* ... */ } })
  const state = yield* effector.getState()
  // ...
})
```

## Documentation

For detailed documentation, see the [PRD](../../src/effectors/PRD.md).

## License

MIT 