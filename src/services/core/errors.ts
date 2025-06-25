/**
 * @file Core error types for EffectiveAgent
 * @module services/core/errors
 */

import { EffectiveError } from "@/errors.js"

/**
 * Error thrown when an argument is invalid
 */
export class BadArgument extends EffectiveError {
  constructor(params: {
    description: string
    module?: string
    method?: string
    cause?: unknown
  }) {
    super({
      ...params,
      module: params.module ?? "core",
      method: params.method ?? "validate",
    })
  }
}

/**
 * Error thrown when a system operation fails
 */
export class SystemError extends EffectiveError {
  constructor(params: {
    description: string
    module?: string
    method?: string
    cause?: unknown
  }) {
    super({
      ...params,
      module: params.module ?? "core",
      method: params.method ?? "system",
    })
  }
}
