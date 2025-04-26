import * as Stream from "effect/Stream";
import { Effect } from "effect";
import { describe, it, expect } from "vitest";

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

function createResponse<T>(result: T): EffectiveResponse<T> {
  return { data: result, metadata: { wrapped: true } };
}

describe("minimal-stream-repro", () => {
  it("pass-through works for already wrapped response", async () => {
    const results: EffectiveResponse<StreamingTextResult>[] = [];
    await Effect.runPromise(
      Stream.runForEach(providerStreamText(), (item) => Effect.sync(() => results.push(item)))
    );
    expect(results).toHaveLength(1);
    expect(results[0].data.text).toBe("Hello");
    expect(results[0].metadata.foo).toBe("bar");
  });

  it("mapping over Effect<StreamingTextResult> causes type error (should fail TS)", async () => {
    // This line would cause a type error if uncommented:
    // const s2 = Stream.map(providerStreamTextEffect(), result => createResponse(result));
    // Instead, we use the correct pattern:
    const results: EffectiveResponse<StreamingTextResult>[] = [];
    await Effect.runPromise(
      Stream.runForEach(
        Stream.flatMap(
          providerStreamTextEffect(),
          (effect) => Effect.map(effect, result => createResponse(result))
        ),
        (item) => Effect.sync(() => results.push(item))
      )
    );
    expect(results).toHaveLength(1);
    expect(results[0].data.text).toBe("Hello");
    expect(results[0].metadata.wrapped).toBe(true);
  });
});
