/**
 * @file Chat History Service implementation for conversation management and tracking
 * @module services/pipeline/chat/service
 */
import { ChatHistory, ChatHistoryError, ChatHistoryServiceApi, ChatMessage } from "@/services/pipeline/chat/api.js";
import { Effect, Either, Layer, Option, Ref, pipe } from "effect";

/**
 * Chat agent state for tracking conversation activity
 */
export interface ChatAgentState {
  readonly historyCount: number
  readonly lastActivity: Option.Option<{
    readonly timestamp: number
    readonly action: "LOAD" | "SAVE" | "APPEND_MESSAGE" | "APPEND_RESPONSE"
    readonly historyId?: string
    readonly success: boolean
  }>
  readonly activityHistory: ReadonlyArray<{
    readonly timestamp: number
    readonly action: "LOAD" | "SAVE" | "APPEND_MESSAGE" | "APPEND_RESPONSE"
    readonly historyId?: string
    readonly success: boolean
    readonly messageCount?: number
  }>
  readonly activeHistories: ReadonlyArray<string>
}



// Validation functions
const validateHistoryId = (historyId: string): Effect.Effect<string, ChatHistoryError> => {
  if (!historyId || typeof historyId !== "string" || historyId.length === 0) {
    return Effect.fail(ChatHistoryError.invalidHistoryId(historyId));
  }
  return Effect.succeed(historyId);
};

const validateHistory = (history: ChatHistory): Effect.Effect<ChatHistory, ChatHistoryError> => {
  if (!history || !Array.isArray(history.messages)) {
    return Effect.fail(ChatHistoryError.invalidHistory("missing or invalid messages array"));
  }

  // Validate each message
  for (const msg of history.messages) {
    if (!msg.role || !msg.content || typeof msg.content !== "string") {
      return Effect.fail(ChatHistoryError.invalidHistory("invalid message format"));
    }
    if (!["user", "assistant", "system"].includes(msg.role)) {
      return Effect.fail(ChatHistoryError.invalidHistory(`invalid role: ${msg.role}`));
    }
  }

  return Effect.succeed(history);
};

// Service implementation
export class ChatHistoryService extends Effect.Service<ChatHistoryServiceApi>()(
  "ChatHistoryService",
  {
    effect: Effect.gen(function* () {
      const initialState: ChatAgentState = {
        historyCount: 0,
        lastActivity: Option.none(),
        activityHistory: [],
        activeHistories: []
      };

      // Create internal state management
      const internalStateRef = yield* Ref.make<ChatAgentState>(initialState);

      // Create a strongly typed Ref for the Map
      const historyStore: Ref.Ref<Map<string, ChatHistory>> =
        yield* Ref.make(new Map<string, ChatHistory>());

      yield* Effect.log("ChatHistoryService initialized");

      // Helper function to update internal state
      const updateState = (activity: {
        readonly action: "LOAD" | "SAVE" | "APPEND_MESSAGE" | "APPEND_RESPONSE"
        readonly historyId?: string
        readonly success: boolean
        readonly messageCount?: number
      }) => Effect.gen(function* () {
        const currentState = yield* Ref.get(internalStateRef);
        const store = yield* Ref.get(historyStore);

        const activityRecord = {
          timestamp: Date.now(),
          action: activity.action,
          historyId: activity.historyId,
          success: activity.success,
          messageCount: activity.messageCount
        };

        const updatedHistory = [
          ...currentState.activityHistory,
          activityRecord
        ].slice(-50); // Keep last 50 activities

        const activeHistories = Array.from(store.keys());

        const newState: ChatAgentState = {
          historyCount: store.size,
          lastActivity: Option.some({
            timestamp: activityRecord.timestamp,
            action: activity.action,
            historyId: activity.historyId,
            success: activity.success
          }),
          activityHistory: updatedHistory,
          activeHistories
        };

        yield* Ref.set(internalStateRef, newState);

        yield* Effect.log("Updated chat history state", {
          action: activity.action,
          historyId: activity.historyId,
          success: activity.success,
          totalHistories: newState.historyCount
        });
      });

      return {
        loadHistory: (
          historyId: string,
        ): Effect.Effect<ChatHistory | null, ChatHistoryError> => {
          return Effect.gen(function* () {


            const result = yield* Effect.either(
              pipe(
                validateHistoryId(historyId),
                Effect.flatMap(() => Ref.get(historyStore)),
                Effect.map((store: Map<string, ChatHistory>) => store.get(historyId) ?? null)
              )
            );

            if (Either.isLeft(result)) {
              // Update state with failed load
              yield* updateState({
                action: "LOAD",
                historyId,
                success: false
              });

              return yield* Effect.fail(result.left);
            } else {
              // Update state with successful load
              yield* updateState({
                action: "LOAD",
                historyId,
                success: true,
                messageCount: result.right?.messages.length
              });

              return result.right;
            }
          });
        },

        saveHistory: (
          historyId: string,
          history: ChatHistory,
        ): Effect.Effect<void, ChatHistoryError> => {
          return Effect.gen(function* () {


            const result = yield* Effect.either(
              pipe(
                Effect.all([
                  validateHistoryId(historyId),
                  validateHistory(history)
                ]),
                Effect.flatMap(() => Ref.get(historyStore)),
                Effect.flatMap((store: Map<string, ChatHistory>) => {
                  const updatedStore = new Map<string, ChatHistory>(store);
                  updatedStore.set(historyId, history);
                  return Ref.set(historyStore, updatedStore);
                })
              )
            );

            if (Either.isLeft(result)) {
              // Update state with failed save
              yield* updateState({
                action: "SAVE",
                historyId,
                success: false,
                messageCount: history?.messages?.length || 0
              });

              return yield* Effect.fail(result.left);
            } else {
              // Update state with successful save
              yield* updateState({
                action: "SAVE",
                historyId,
                success: true,
                messageCount: history.messages.length
              });
            }
          });
        },

        loadAndAppendMessage: (
          historyId: string | undefined,
          userMessage: string,
        ): Effect.Effect<ChatMessage[], ChatHistoryError> => {
          return Effect.gen(function* () {


            try {
              // Start with empty messages array
              let messages: ChatMessage[] = [];

              // If historyId provided, try to load existing history
              if (historyId) {
                const history = yield* pipe(
                  validateHistoryId(historyId),
                  Effect.flatMap(() => Ref.get(historyStore)),
                  Effect.map((store: Map<string, ChatHistory>) => store.get(historyId) ?? null),
                  Effect.mapError(error =>
                    error instanceof ChatHistoryError ? error :
                      ChatHistoryError.loadFailed(historyId, error)
                  )
                );
                if (history) {
                  messages = history.messages;
                }
              }

              // Append user message
              messages.push({
                role: "user" as const,
                content: userMessage,
              });

              // Update state with successful message append
              yield* updateState({
                action: "APPEND_MESSAGE",
                historyId,
                success: true,
                messageCount: messages.length
              });

              return messages;

            } catch (error) {
              // Update state with failed message append
              yield* updateState({
                action: "APPEND_MESSAGE",
                historyId,
                success: false
              });

              return yield* Effect.fail(
                error instanceof ChatHistoryError ? error :
                  ChatHistoryError.loadFailed(historyId || "undefined", error)
              );
            }
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                // Update state with failed message append
                yield* updateState({
                  action: "APPEND_MESSAGE",
                  historyId,
                  success: false
                });

                return yield* Effect.fail(
                  error instanceof ChatHistoryError ? error :
                    ChatHistoryError.loadFailed(historyId || "undefined", error)
                );
              })
            )
          );
        },

        appendAndSaveResponse: (
          historyId: string | undefined,
          messages: ChatMessage[],
          response: string,
        ): Effect.Effect<void, ChatHistoryError> => {
          return Effect.gen(function* () {
            if (!historyId) {
              return Effect.succeed(void 0);
            }



            try {
              const updatedMessages = [
                ...messages,
                { role: "assistant" as const, content: response },
              ];

              yield* pipe(
                validateHistoryId(historyId),
                Effect.flatMap(() => validateHistory({ messages: updatedMessages })),
                Effect.flatMap(() => Ref.get(historyStore)),
                Effect.flatMap((store: Map<string, ChatHistory>) => {
                  const updatedStore = new Map<string, ChatHistory>(store);
                  updatedStore.set(historyId, { messages: updatedMessages });
                  return Ref.set(historyStore, updatedStore);
                }),
                Effect.mapError(error =>
                  error instanceof ChatHistoryError ? error :
                    ChatHistoryError.saveFailed(historyId, error)
                )
              );

              // Update state with successful response append
              yield* updateState({
                action: "APPEND_RESPONSE",
                historyId,
                success: true,
                messageCount: updatedMessages.length
              });

            } catch (error) {
              // Update state with failed response append
              yield* updateState({
                action: "APPEND_RESPONSE",
                historyId,
                success: false
              });

              return yield* Effect.fail(
                error instanceof ChatHistoryError ? error :
                  ChatHistoryError.saveFailed(historyId, error)
              );
            }
          }).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                // Update state with failed response append
                yield* updateState({
                  action: "APPEND_RESPONSE",
                  historyId,
                  success: false
                });

                return yield* Effect.fail(
                  error instanceof ChatHistoryError ? error :
                    ChatHistoryError.saveFailed(historyId || "undefined", error)
                );
              })
            )
          );
        },

        /**
         * Get the current agent state for monitoring/debugging
         */
        getAgentState: () => Ref.get(internalStateRef),

        /**
         * Get the runtime for direct access in tests
         */
        getRuntime: () => Effect.succeed({
          state: internalStateRef
        }),

        /**
         * Terminate the service (no-op since we don't have external runtime)
         */
        terminate: () => Effect.succeed(void 0)
      };
    }),
    dependencies: []
  }
) { }
