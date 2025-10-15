/**
 * @file WebSocket server for the Actor Runtime, allowing stateful, per-client agent interactions.
 */
import { Effect, Fiber, Queue, Ref, Sink, Stream } from "effect";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import { wsParse, wsStringify } from "@/utils/ws-utils.js";
import { getAgentRuntime } from "../ea-agent-runtime/production-runtime.js";
import { createActorRuntimeManager } from "./actor-runtime.js";
import { AgentRuntimeError } from "./errors.js";
import type { AgentActivity, AgentRuntimeId } from "./types.js";

export interface ActorServerApi {
  readonly wss: WebSocketServer;
}

export class ActorServer extends Effect.Service<ActorServerApi>()(
  "ActorServer",
  {
    effect: Effect.gen(function* () {
      const agentRuntime = yield* Effect.promise(() => getAgentRuntime());
      const manager = createActorRuntimeManager(agentRuntime);

      const wsPort = Number(process.env.WS_PORT) || 8081;
      const wss = new WebSocketServer({ port: wsPort });

      wss.on("connection", (ws: WebSocket) => {
        Effect.runFork(
          Effect.gen(function* () {
            const actorIdRef = yield* Ref.make<AgentRuntimeId | null>(null);
            const sendQueue = yield* Queue.unbounded<AgentActivity>();

            const fiber = yield* Stream.fromQueue(sendQueue).pipe(
              Stream.map(wsStringify),
              Stream.run(
                Sink.forEach((message) =>
                  Effect.try({
                    try: () => ws.send(message),
                    catch: (e) =>
                      new AgentRuntimeError({
                        agentRuntimeId: "unknown",
                        message: "WebSocket send error",
                        cause: e,
                      }),
                  })
                )
              ),
              Effect.fork
            );

            ws.on("message", (message: string) => {
              Effect.runFork(
                Effect.gen(function* () {
                  const activity = yield* wsParse(message);
                  const actorId = yield* Ref.get(actorIdRef);

                  if (
                    activity.type === "SYSTEM" &&
                    activity.payload.command === "create"
                  ) {
                    const agentType = activity.payload.agentType as string;
                    const initialState = activity.payload.initialState ?? {};
                    const newActorId = crypto.randomUUID();

                    yield* Ref.set(actorIdRef, newActorId);

                    const actor = yield* manager.create(
                      newActorId,
                      agentType,
                      initialState
                    );
                    yield* actor.subscribe(sendQueue);

                    ws.send(
                      wsStringify({
                        type: "SYSTEM",
                        agentRuntimeId: newActorId,
                        payload: { status: "created", actorId: newActorId },
                        sequence: 0,
                        timestamp: Date.now(),
                        metadata: {},
                      })
                    );
                  } else if (actorId) {
                    yield* manager.send(actorId, activity);
                  }
                })
              );
            });

            ws.on("close", () => {
              Effect.runFork(
                Effect.gen(function* () {
                  const actorId = yield* Ref.get(actorIdRef);
                  if (actorId) {
                    yield* manager.terminate(actorId);
                  }
                  yield* Fiber.interrupt(fiber);
                })
              );
            });
          })
        );
      });

      return { wss };
    }),
  }
) {}
