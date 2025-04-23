/**
 * @file Tests for the ObjectService
 */

import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import { createPersonSchema } from "../schema-utils.js";
import { ObjectService } from "../service.js";

// Define test types
interface Person {
    name: string;
    age: number;
    email?: string;
}

describe("ObjectService", () => {
    // Mock implementation for the ObjectService
    const createTestObjectService = () => {
        return Effect.gen(function* () {
            // Sample response
            const mockResponse = {
                data: {
                    name: "John Doe",
                    age: 30,
                    email: "john@example.com"
                },
                model: "test-model",
                timestamp: new Date(),
                id: "test-response-id",
                usage: {
                    promptTokens: 100,
                    completionTokens: 50,
                    totalTokens: 150
                }
            };

            // Return mock implementation
            return {
                generate: <T>(_options: any) => {
                    return Effect.succeed(mockResponse as any);
                }
            };
        });
    };

    // Create test harness
    const serviceHarness = createServiceTestHarness(
        ObjectService,
        createTestObjectService
    );

    // Define tests
    it("should generate an object successfully", async () => {
        const schema = createPersonSchema();

        const effect = Effect.gen(function* () {
            const service = yield* ObjectService;

            const result = yield* service.generate<Person>({
                modelId: "test-model",
                prompt: "Generate a person named John Doe",
                system: Option.none(),
                schema,
                span: {} as any, // Mock span
            });

            expect(result.data.name).toBe("John Doe");
            expect(result.data.age).toBe(30);
            expect(result.model).toBe("test-model");
            expect(result.id).toBe("test-response-id");
            expect(result.usage?.totalTokens).toBe(150);

            return result;
        });

        await serviceHarness.runTest(effect);
    });
}); 