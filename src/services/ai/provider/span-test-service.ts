/**
 * Minimal stub service using Effect.Service to experiment with Effect.withSpan.
 */
import { Effect } from "effect";

export interface SpanTestServiceApi {
  doSomething: (input: string) => Effect.Effect<string>;
}

export class SpanTestService extends Effect.Service<SpanTestServiceApi>()(
  "SpanTestService",
  {
    effect: Effect.gen(function* () {
      return {
        doSomething: (input: string): Effect.Effect<string> =>
          Effect.gen(function* () {
            yield* Effect.logDebug(`Input: ${input}`);
            const result = yield* Effect.withSpan(
              Effect.gen(function* () {
                yield* Effect.logDebug("Inside span!");
                return `Hello, ${input}!`;
              }),
              "SpanTestService.doSomething"
            );
            yield* Effect.logDebug(`Result: ${result}`);
            return result;
          })
      };
    })
  }
) {}

export const make = (): Effect.Effect<SpanTestService> => Effect.succeed(new SpanTestService());

export default SpanTestService;
