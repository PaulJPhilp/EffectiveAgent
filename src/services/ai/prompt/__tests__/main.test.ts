import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { RenderingError, TemplateNotFoundError } from "../../errors.js";
import { PromptService } from "../service.js";

// We'll use the real prompt config file from the system
// and let the real ConfigurationService handle loading

// Helper function to create a test instance of PromptService
const getPromptService = () => Effect.gen(function* () {
    // Get the PromptService instance (using the real service implementation)
    const service = yield* PromptService;
    
    // Load prompts using the real ConfigurationService
    yield* service.load();
    
    return service;
});

// --- Tests ---
describe("PromptApi", () => {

    it("renderTemplate returns rendered string for valid template", () => 
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Test the template rendering
            const result = yield* service.renderTemplate({ 
                templateName: "greeting", 
                context: { name: "Alice", place: "Wonderland" } 
            });
            
            // Assert result
            expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
        })
    );

    it("renderTemplate fails with TemplateNotFoundError for missing template", () =>
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Attempt to render a non-existent template
            const result = yield* Effect.either(
                service.renderTemplate({ templateName: "missing", context: {} })
            );
            
            // Assert error
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(TemplateNotFoundError);
                expect((result.left as TemplateNotFoundError).templateName).toBe("missing");
            }
        })
    );

    it("renderTemplate fails with RenderingError for invalid template syntax", () =>
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Attempt to render a template with invalid syntax
            const result = yield* Effect.either(
                service.renderTemplate({ templateName: "bad", context: { name: "Bob" } })
            );
            
            // Assert error
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(RenderingError);
            }
        })
    );

    it("renderString returns rendered string for valid template string", () =>
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Test direct string rendering
            const result = yield* service.renderString({ 
                templateString: "Hi, {{name}}!", 
                context: { name: "Eve" } 
            });
            
            // Assert result
            expect(result).toBe("Hi, Eve!");
        })
    );

    it("renderString fails with RenderingError for invalid template string", () =>
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Attempt to render a string with invalid syntax
            const result = yield* Effect.either(
                service.renderString({ 
                    templateString: "Hello, {{ name }", 
                    context: { name: "X" } 
                })
            );
            
            // Assert error
            expect(Either.isLeft(result)).toBe(true);
            if (Either.isLeft(result)) {
                expect(result.left).toBeInstanceOf(RenderingError);
            }
        })
    );

    it("renderTemplate handles missing context variables gracefully", () =>
        Effect.gen(function* () {
            // Get service instance
            const service = yield* getPromptService();
            
            // Test with missing context variables
            const result = yield* service.renderTemplate({ 
                templateName: "greeting", 
                context: {} 
            });
            
            // Assert result handles missing variables by rendering empty values
            expect(result).toBe("Hello, ! Welcome to .");
        })
    );
});
