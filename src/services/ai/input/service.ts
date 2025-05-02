import { type EffectiveRole } from "@/schema.js"
import { AiInput, Message, type Part, PartTypeId, TextPart } from "@effect/ai/AiInput";
import { Model, User } from "@effect/ai/AiRole"
import * as Chunk from "effect/Chunk";
import { EffectivePartType, FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "./schema.js";


export class EffectiveInput {
    private readonly input: AiInput

    constructor(input: AiInput = Chunk.empty()) {
        this.input = input
    }

    getMessages(): Chunk.Chunk<EffectiveMessage> {
        return this.input
    }

    addMessage(message: EffectiveMessage): EffectiveInput {
        return new EffectiveInput(Chunk.append(this.input, message))
    }

    addMessages(messages: ReadonlyArray<Message>): EffectiveInput {
        return new EffectiveInput(Chunk.appendAll(this.input, Chunk.fromIterable(messages)));
    }

    addTextPart(text: string, role: EffectiveRole = "assistant"): EffectiveInput {
        const textPart = new TextPart({ content: text });
        return this.addPartAsMessage(textPart, role);
    }

    addFilePart(filePart: FilePart): EffectiveInput {
        return this.addPartAsMessage(this.createTextPart(
            `File: ${filePart.fileName}\nType: ${filePart.fileType}`
        ));
    }

    addReasoningPart(reasoningPart: ReasoningPart): EffectiveInput {
        return this.addPartAsMessage(this.createTextPart(reasoningPart.text));
    }

    addRedactedReasoningPart(reasoningPart: RedactedReasoningPart): EffectiveInput {
        return this.addPartAsMessage(this.createTextPart("[REDACTED REASONING]"));
    }

    addToolPart(toolPart: ToolPart): EffectiveInput {
        return this.addPartAsMessage(this.createTextPart(
            `Tool Call: ${toolPart.toolName}\nArguments: ${toolPart.toolArguments}`
        ));
    }

    addToolResultPart(toolResultPart: ToolResultPart): EffectiveInput {
        return this.addPartAsMessage(this.createTextPart(toolResultPart.data));
    }

    addPartOrMessage(input: EffectivePartType | EffectiveMessage): EffectiveInput {
        if (input instanceof EffectiveMessage) {
            return this.addMessage(input);
        }

        // Handle each part type
        if (input instanceof FilePart) {
            return this.addFilePart(input);
        }
        if (input instanceof ReasoningPart) {
            return this.addReasoningPart(input);
        }
        if (input instanceof RedactedReasoningPart) {
            return this.addRedactedReasoningPart(input);
        }
        if (input instanceof ToolPart) {
            return this.addToolPart(input);
        }
        if (input instanceof ToolResultPart) {
            return this.addToolResultPart(input);
        }
        if (PartTypeId in input) {
            return this.addPartAsMessage(input as Part);
        }

        // Fallback - convert to text part
        return this.addTextPart(String(input));
    }

    // Helper methods
    private createTextPart(text: string): TextPart {
        return new TextPart({ content: text });
    }

    private addPartAsMessage(part: Part, role: EffectiveRole = "assistant"): EffectiveInput {
        const aiRole = this.mapToAiRole(role);
        return this.addMessage(new Message({ role: aiRole, parts: Chunk.make(part) }));
    }

    private mapToAiRole(role: EffectiveRole): User | Model {
        switch (role) {
            case "user": return new User();
            case "system": return new Model();
            default: return new Model();
        }
    }
}

export class EffectiveMessage extends Message {
    static fromInput = Message.fromInput;

    static fromEffectivePart(part: EffectivePartType): EffectiveMessage {
        // Helper to create a proper TextPart
        const createTextPart = (content: string): Part => new TextPart({ content });

        // Handle new EffectivePart types with custom message creation
        if (part instanceof FilePart) {
            const text = `File: ${part.fileName}\nType: ${part.fileType}`;
            return Message.fromInput(createTextPart(text));
        }

        if (part instanceof ReasoningPart) {
            return Message.fromInput(createTextPart(part.text));
        }

        if (part instanceof RedactedReasoningPart) {
            return Message.fromInput(createTextPart("[REDACTED REASONING]"));
        }

        if (part instanceof ToolPart) {
            const text = `Tool Call: ${part.toolName}\nArguments: ${part.toolArguments}`;
            return Message.fromInput(createTextPart(text));
        }

        if (part instanceof ToolResultPart) {
            return Message.fromInput(createTextPart(part.data));
        }

        // For any other part type that is already a Part
        if (PartTypeId in part) {
            return Message.fromInput(part as Part);
        }

        // Last resort - convert to text part
        return Message.fromInput(createTextPart(String(part)));
    }
}