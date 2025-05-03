// src/services/pipeline/chat/service.ts
import { Effect, Ref, pipe } from "effect";
import type { ChatHistory, ChatHistoryServiceApi, ChatMessage } from "./api.js";
import { ChatHistoryError } from "./api.js";

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
      // Create a strongly typed Ref for the Map
      const historyStore: Ref.Ref<Map<string, ChatHistory>> = 
        yield* Ref.make(new Map<string, ChatHistory>());

      return {
        loadHistory: (
          historyId: string,
        ): Effect.Effect<ChatHistory | null, ChatHistoryError> => {
          return pipe(
            validateHistoryId(historyId),
            Effect.flatMap(() => Ref.get(historyStore)),
            Effect.map((store: Map<string, ChatHistory>) => store.get(historyId) ?? null),
            Effect.mapError(error => 
              error instanceof ChatHistoryError ? error : 
              ChatHistoryError.loadFailed(historyId, error)
            )
          );
        },

        saveHistory: (
          historyId: string,
          history: ChatHistory,
        ): Effect.Effect<void, ChatHistoryError> => {
          return pipe(
            Effect.all([
              validateHistoryId(historyId),
              validateHistory(history)
            ]),
            Effect.flatMap(() => Ref.get(historyStore)),
            Effect.flatMap((store: Map<string, ChatHistory>) => {
              const updatedStore = new Map<string, ChatHistory>(store);
              updatedStore.set(historyId, history);
              return Ref.set(historyStore, updatedStore);
            }),
            Effect.mapError(error => 
              error instanceof ChatHistoryError ? error :
              ChatHistoryError.saveFailed(historyId, error)
            )
          );
        },

        loadAndAppendMessage: (
          historyId: string | undefined,
          userMessage: string,
        ): Effect.Effect<ChatMessage[], ChatHistoryError> => {
          return Effect.gen(function* () {
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

            return messages;
          });
        },

        appendAndSaveResponse: (
          historyId: string | undefined,
          messages: ChatMessage[],
          response: string,
        ): Effect.Effect<void, ChatHistoryError> => {
          if (!historyId) {
            return Effect.succeed(void 0);
          }

          const updatedMessages = [
            ...messages,
            { role: "assistant" as const, content: response },
          ];

          return pipe(
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
        },
      };
    }),
  },
) {}
