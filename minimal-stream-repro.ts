import * as Stream from "effect/Stream";
import { Effect } from "effect";

// Types matching your main codebase
interface StreamingTextResult {
  chunk: string;
  text: string;
  isLast: boolean;
  currentTokenCount: number;
  controller: {
    pause: () => void;
    resume: () => void;
    cancel: () => void;
    isPaused: boolean;
  };
}

interface EffectiveResponse<T> {
  data: T;
  metadata: { [key: string]: unknown };
}

// Simulated provider implementation (matches ProviderClientApi signature)
function providerStreamText(): Stream.Stream<EffectiveResponse<StreamingTextResult>, Error> {
  return Stream.fromIterable([
    {
      data: {
        chunk: "Hello",
        text: "Hello",
        isLast: false,
        currentTokenCount: 1,
        controller: {
          pause: () => {},
          resume: () => {},
          cancel: () => {},
          isPaused: false
        }
      },
      metadata: { foo: "bar" }
    }
  ]);
}

// Minimal wrapper function (should just pass through)
function streamTextWrapper(): Stream.Stream<EffectiveResponse<StreamingTextResult>, Error> {
  return providerStreamText();
}

// --- Scenario 1: Provider emits EffectiveResponse<StreamingTextResult> ---
// This should type-check and work as a pass-through.
const s = streamTextWrapper();

// --- Scenario 2: Provider emits Effect<StreamingTextResult> ---
function providerStreamTextEffect(): Stream.Stream<Effect.Effect<StreamingTextResult>, Error> {
  return Stream.fromIterable([
    Effect.succeed({
      chunk: "Hello",
      text: "Hello",
      isLast: false,
      currentTokenCount: 1,
      controller: { pause: () => {}, resume: () => {}, cancel: () => {}, isPaused: false }
    })
  ]);
}

// This will cause a type error (uncomment to see):
// const s2 = Stream.map(providerStreamTextEffect(), result => createResponse(result));
// function createResponse<T>(result: T): EffectiveResponse<T> {
//   return { data: result, metadata: { wrapped: true } };
// }

// --- Scenario 3: Correct fix for Effect<StreamingTextResult> ---
function createResponse<T>(result: T): EffectiveResponse<T> {
  return { data: result, metadata: { wrapped: true } };
}
const s3 = Stream.flatMap(
  providerStreamTextEffect(),
  (effect) => Effect.map(effect, result => createResponse(result))
);
// s3 is Stream<EffectiveResponse<StreamingTextResult>, Error>

