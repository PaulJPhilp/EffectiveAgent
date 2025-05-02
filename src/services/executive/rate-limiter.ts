/**
 * @file In-memory rate limiter implementation
 */

import { Effect, HashMap, Option, Ref } from "effect";
import type { RateLimiter, RateLimitResult } from "./api.js";

interface RequestWindow {
  /** Start time of the current window */
  readonly startTime: number;
  /** Request count in the current window */
  readonly count: number;
  /** Last request time */
  readonly lastRequestTime: number;
}

/**
 * Simple in-memory rate limiter implementation
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows: Ref.Ref<HashMap.HashMap<string, RequestWindow>> = 
    Ref.unsafeMake<HashMap.HashMap<string, RequestWindow>>(HashMap.empty());

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly minInterval?: number
  ) {}

  checkLimit = (key: string): Effect.Effect<RateLimitResult, never, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const now = Date.now();
      const windows = yield* Ref.get(self.windows);
      const currentWindow = Option.getOrUndefined(HashMap.get(windows, key)) as RequestWindow | undefined;

      if (!currentWindow) {
        return { allowed: true };
      }

      // Check if we're in a new window
      if (now - currentWindow.startTime >= self.windowMs) {
        return { allowed: true };
      }

      // Check minimum interval
      if (self.minInterval && now - currentWindow.lastRequestTime < self.minInterval) {
        return {
          allowed: false,
          retryAfterMs: self.minInterval - (now - currentWindow.lastRequestTime),
          currentCount: currentWindow.count
        };
      }

      // Check request count
      if (currentWindow.count >= self.maxRequests) {
        return {
          allowed: false,
          retryAfterMs: self.windowMs - (now - currentWindow.startTime),
          currentCount: currentWindow.count
        };
      }

      return {
        allowed: true,
        currentCount: currentWindow.count
      };
    });
  }

  recordRequest = (key: string): Effect.Effect<void, never, never> => {
    const self = this;
    return Effect.gen(function* (_) {
      const now = Date.now();
      yield* Ref.update(self.windows, windows => {
        const currentWindow = Option.getOrUndefined(HashMap.get(windows, key)) as RequestWindow | undefined;
        
        // If no window exists or it's expired, create a new one
        if (!currentWindow || now - currentWindow.startTime >= self.windowMs) {
          return HashMap.set(windows, key, {
            startTime: now,
            count: 1,
            lastRequestTime: now
          });
        }

        // Update existing window
        return HashMap.set(windows, key, {
          startTime: currentWindow.startTime,
          count: currentWindow.count + 1,
          lastRequestTime: now
        });
      });
    });
  }
}
