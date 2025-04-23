import { TextPart } from "@effect/ai/AiInput"
import { Model, User } from "@effect/ai/AiRole"
import { Chunk } from "effect"
import { describe, expect, it } from "vitest"
import { FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "../schema.js"
import { EffectiveInput, EffectiveMessage } from "../service.js"

describe("EffectiveInput", () => {
    describe("message creation", () => {
        it("should create a user message", () => {
            const input = new EffectiveInput()
            const message = input.addMessage(new EffectiveMessage({
                role: new User(),
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            }))
            const messages = Chunk.toReadonlyArray(message.getMessages())
            expect(messages.length).toBe(1)
            expect(messages[0].role).toBe("user")
            expect(messages[0].parts.length).toBe(1)
            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("Hello")
        })

        it("should create an assistant message", () => {
            const input = new EffectiveInput()
            const message = input.addMessage(new EffectiveMessage({
                role: new Model(),
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            }))
            const messages = Chunk.toReadonlyArray(message.getMessages())
            expect(messages.length).toBe(1)
            expect(messages[0].role).toBe("assistant")
            expect(messages[0].parts.length).toBe(1)
            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("Hello")
        })

        it("should create a system message", () => {
            const input = new EffectiveInput()
            const systemMessage = input.addTextPart("Hello", "system")
            const messages = Chunk.toReadonlyArray(systemMessage.getMessages())
            expect(messages.length).toBe(1)
            expect(messages[0].role).toBe("system")
            expect(messages[0].parts.length).toBe(1)
            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("Hello")
        })
    })

    describe("message parts", () => {
        it("should add a file part", () => {
            const input = new EffectiveInput()
            const filePart = new FilePart({
                _tag: "FilePart",
                fileName: "test.txt",
                fileContent: new Uint8Array([1, 2, 3]),
                fileType: "text/plain"
            })

            const updatedInput = input.addFilePart(filePart)

            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(1)

            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts.length).toBe(1)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toContain("File: test.txt")
            expect((parts[0] as TextPart).content).toContain("Type: text/plain")
        })

        it("should add a reasoning part", () => {
            const input = new EffectiveInput()
            const reasoningPart = new ReasoningPart({
                _tag: "ReasoningPart",
                type: "reasoning",
                text: "Let me think about this",
                signature: "thinking"
            })

            const updatedInput = input.addReasoningPart(reasoningPart)

            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(1)

            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts.length).toBe(1)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("Let me think about this")
        })

        it("should add a redacted reasoning part", () => {
            const input = new EffectiveInput()
            const redactedPart = new RedactedReasoningPart({
                _tag: "RedactedReasoningPart",
                type: "redacted-reasoning",
                data: "Redacted content"
            })

            const updatedInput = input.addRedactedReasoningPart(redactedPart)

            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(1)

            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts.length).toBe(1)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("[REDACTED REASONING]")
        })

        it("should add a tool part", () => {
            const input = new EffectiveInput()
            const toolPart = new ToolPart({
                _tag: "ToolPart",
                type: "tool-call-part",
                toolCallId: "123",
                toolName: "calculator",
                toolDescription: "Calculates numbers",
                toolArguments: "1 + 1"
            })

            const updatedInput = input.addToolPart(toolPart)

            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(1)

            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts.length).toBe(1)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toContain("Tool Call: calculator")
            expect((parts[0] as TextPart).content).toContain("Arguments: 1 + 1")
        })

        it("should add a tool result part", () => {
            const input = new EffectiveInput()
            const toolResultPart = new ToolResultPart({
                _tag: "ToolResultPart",
                type: "tool-result",
                data: "2"
            })

            const updatedInput = input.addToolResultPart(toolResultPart)

            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(1)

            const parts = Chunk.toReadonlyArray(messages[0].parts)
            expect(parts.length).toBe(1)
            expect(parts[0]).toBeInstanceOf(TextPart)
            expect((parts[0] as TextPart).content).toBe("2")
        })
    })

    describe("message management", () => {
        it("should maintain message order", () => {
            const input = new EffectiveInput()
            const msg1 = input.addMessage(new EffectiveMessage({
                role: new User(),
                parts: Chunk.make(new TextPart({ content: "First" }))
            }))
            const msg2 = msg1.addMessage(new EffectiveMessage({
                role: new Model(),
                parts: Chunk.make(new TextPart({ content: "Second" }))
            }))
            const msg3 = msg2.addMessage(new EffectiveMessage({
                role: new Model(),
                parts: Chunk.make(new TextPart({ content: "Third" }))
            }))

            // Get the messages from the final updated input
            const messages = Chunk.toReadonlyArray(msg3.getMessages())
            expect(messages.length).toBe(3)

            // Verify message content in order
            const parts1 = Chunk.toReadonlyArray(messages[0].parts)
            const parts2 = Chunk.toReadonlyArray(messages[1].parts)
            const parts3 = Chunk.toReadonlyArray(messages[2].parts)

            expect((parts1[0] as TextPart).content).toBe("First")
            expect((parts2[0] as TextPart).content).toBe("Second")
            expect((parts3[0] as TextPart).content).toBe("Third")
        })

        it("should allow multiple parts per message through addPartOrMessage", () => {
            const input = new EffectiveInput()

            // Start with a text message
            const textPart = new TextPart({ content: "Initial text" })
            let updatedInput = input.addPartOrMessage(textPart)

            // Add a file part
            const filePart = new FilePart({
                _tag: "FilePart",
                fileName: "test.txt",
                fileContent: new Uint8Array([1, 2, 3]),
                fileType: "text/plain"
            })
            updatedInput = updatedInput.addPartOrMessage(filePart)

            // Add a reasoning part
            const reasoningPart = new ReasoningPart({
                _tag: "ReasoningPart",
                type: "reasoning",
                text: "Additional reasoning",
                signature: "thinking"
            })
            updatedInput = updatedInput.addPartOrMessage(reasoningPart)

            // Verify three separate messages were created
            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())
            expect(messages.length).toBe(3)

            // Each message should have a single text part that represents the original part
            expect((Chunk.toReadonlyArray(messages[0].parts)[0] as TextPart).content).toBe("Initial text")
            expect((Chunk.toReadonlyArray(messages[1].parts)[0] as TextPart).content).toContain("File: test.txt")
            expect((Chunk.toReadonlyArray(messages[2].parts)[0] as TextPart).content).toBe("Additional reasoning")
        })
    })

    describe("role mapping", () => {
        it("should map user role correctly", () => {
            const input = new EffectiveInput()
            const textPart = new TextPart({ content: "Test" })
            const message = new EffectiveMessage({
                role: new User(),
                parts: Chunk.make(textPart)
            })

            const updatedInput = input.addMessage(message)
            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())

            // Verify role mapping
            expect(messages[0].role).toBe("user")
        })

        it("should map assistant role correctly", () => {
            const input = new EffectiveInput()
            const textPart = new TextPart({ content: "Test" })
            const message = new EffectiveMessage({
                role: new Model(),
                parts: Chunk.make(textPart)
            })

            const updatedInput = input.addMessage(message)
            const messages = Chunk.toReadonlyArray(updatedInput.getMessages())

            // Verify role mapping
            expect(messages[0].role).toBe("assistant")
        })

        it("should map system role correctly", () => {
            const input = new EffectiveInput()
            const textContent = "Test"
            const systemMessage = input.addTextPart(textContent, "system")

            const messages = Chunk.toReadonlyArray(systemMessage.getMessages())

            // Verify role mapping
            expect(messages[0].role).toBe("system")
        })
    })
}) 