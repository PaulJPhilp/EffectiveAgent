import { Effect } from "effect"
import { ConfigurationError } from "./errors.js"

export class ConfigurationService {
  private readonly config: Map<string, unknown> = new Map()

  constructor(initialConfig: Record<string, unknown> = {}) {
    Object.entries(initialConfig).forEach(([key, value]) => {
      this.config.set(key, value)
    })
  }

  get<T>(key: string): Effect.Effect<T, ConfigurationError> {
    const value = this.config.get(key)
    if (value === undefined) {
      return Effect.fail(
        new ConfigurationError({
          message: `Configuration key ${key} not found`,
          key
        })
      )
    }
    return Effect.succeed(value as T)
  }

  set(key: string, value: unknown): Effect.Effect<void, never> {
    this.config.set(key, value)
    return Effect.succeed(void 0)
  }

  has(key: string): boolean {
    return this.config.has(key)
  }

  delete(key: string): Effect.Effect<void, never> {
    this.config.delete(key)
    return Effect.succeed(void 0)
  }

  clear(): Effect.Effect<void, never> {
    this.config.clear()
    return Effect.succeed(void 0)
  }
} 