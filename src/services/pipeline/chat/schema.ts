import { Schema } from "effect";

export const ChatMessageSchema = Schema.Struct({
    role: Schema.Literal("user", "assistant", "system"),
    content: Schema.String
});

export const ChatHistorySchema = Schema.Struct({
    messages: Schema.Array(ChatMessageSchema)
});

export type ChatMessage = Schema.Schema.Type<typeof ChatMessageSchema>;
export type ChatHistory = Schema.Schema.Type<typeof ChatHistorySchema>; 