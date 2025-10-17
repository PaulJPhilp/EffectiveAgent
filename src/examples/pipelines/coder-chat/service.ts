/**
 * @file Service implementation for the CoderChatPipeline
 * @module ea/pipelines/coder-chat/service
 */

import { Cause, Effect } from "effect";
import type {
    CoderChatPipelineApi,
    CoderChatPipelineInput,
    CoderChatResponse
} from "./contract.js";
import { CoderChatPipelineError } from "./errors.js";
import type { LanguageAnalysis } from "./types.js";

/**
 * Service for documentation operations
 */
export interface DocumentationServiceApi {
    readonly _tag: "DocumentationService"
    readonly getDocumentation: (language: string, topic: string) => Effect.Effect<string, never>
}

/**
 * Implementation of the DocumentationService using Effect.Service pattern
 */
export class DocumentationService extends Effect.Service<DocumentationServiceApi>()("DocumentationService", {
    effect: Effect.succeed({
        _tag: "DocumentationService" as const,
        getDocumentation: (language: string, topic: string): Effect.Effect<string, never> => {
            // Mock implementation - replace with real documentation lookup
            return Effect.succeed(`Documentation for ${topic} in ${language}`);
        }
    }),
    dependencies: []
}) { }

/**
 * Service for language analysis tools
 */
export interface LanguageToolProviderApi {
    readonly _tag: "LanguageToolProvider"
    readonly analyzeCode: (code: string, language: string) => Effect.Effect<LanguageAnalysis, never>
}

/**
 * Implementation of the LanguageToolProvider service using Effect.Service pattern
 */
export class LanguageToolProvider extends Effect.Service<LanguageToolProviderApi>()("LanguageToolProvider", {
    effect: Effect.succeed({
        _tag: "LanguageToolProvider" as const,
        analyzeCode: (_code: string, language: string): Effect.Effect<LanguageAnalysis, never> => {
            // Mock implementation - replace with real code analysis
            return Effect.succeed({
                language,
                complexity: "medium",
                suggestions: ["consider using more descriptive variable names"],
                bestPractices: ["follow SOLID principles"],
                potentialIssues: []
            });
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the CoderChatPipeline service
 */
export class CoderChatPipelineService extends Effect.Service<CoderChatPipelineApi>()(
    "CoderChatPipeline",
    {
        effect: Effect.gen(function* () {
            // Yield dependencies
            const _languageTool = yield* LanguageToolProvider;
            const _documentation = yield* DocumentationService;

            // Helper to get language-specific examples
            const getCodeExample = (language: string, _prompt: string): { code: string; explanation: string } => {
                // TODO: Replace with actual Phoenix MCP server call
                // For now, we'll return predefined examples based on language
                const examples: Record<string, { code: string; explanation: string }> = {
                    typescript: {
                        code: "interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction getUserInfo(userId: string): Promise<User> {\n  return fetch(\`/api/users/\${userId}\`)\n    .then(response => {\n      if (!response.ok) {\n        throw new Error(\`Failed to fetch user: \${response.statusText}\`);\n      }\n      return response.json();\n    });\n}",
                        explanation: "This TypeScript example shows how to define an interface and use it in a typed function that fetches user data asynchronously."
                    },
                    javascript: {
                        code: `function fetchUserData(userId) {\n  return fetch(\`/api/users/\${userId}\`)\n    .then(response => {\n      if (!response.ok) {\n        throw new Error(\`Failed to fetch user: \${response.statusText}\`);\n      }\n      return response.json();\n    })\n    .then(data => {\n      console.log('User data:', data);\n      return data;\n    })\n    .catch(error => {\n      console.error('Error fetching user:', error);\n      throw error;\n    });\n}`,
                        explanation: "This JavaScript function demonstrates proper error handling in asynchronous API calls using promises."
                    },
                    python: {
                        code: `import requests\n\ndef get_user_data(user_id):\n    try:\n        response = requests.get(f"https://api.example.com/users/{user_id}")\n        response.raise_for_status()\n        return response.json()\n    except requests.exceptions.HTTPError as e:\n        print(f"HTTP Error: {e}")\n    except requests.exceptions.RequestException as e:\n        print(f"Error fetching user data: {e}")\n    return None`,
                        explanation: "This Python function shows how to make HTTP requests with proper error handling using the requests library."
                    },
                    java: {
                        code: `public class UserService {\n    private final HttpClient httpClient;\n    \n    public UserService() {\n        this.httpClient = HttpClient.newBuilder()\n            .version(HttpClient.Version.HTTP_2)\n            .build();\n    }\n    \n    public CompletableFuture<User> getUserById(String userId) {\n        HttpRequest request = HttpRequest.newBuilder()\n            .uri(URI.create("https://api.example.com/users/" + userId))\n            .GET()\n            .build();\n            \n        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())\n            .thenApply(HttpResponse::body)\n            .thenApply(this::parseUserJson);\n    }\n    \n    private User parseUserJson(String json) {\n        // Parse JSON and create User object\n        return new User(); // Simplified for example\n    }\n}`,
                        explanation: "This Java example demonstrates using the modern HttpClient to make asynchronous API calls with CompletableFuture."
                    }
                };

                return examples[language.toLowerCase()] || {
                    code: `// Example code for ${language}\nconsole.log('Hello from ${language}!');`,
                    explanation: `Basic example in ${language}.`
                };
            };

            // Helper to get documentation references
            const getDocumentationReferences = (language: string): Array<{ title: string; url: string }> => {
                // TODO: Replace with actual Phoenix MCP server call
                // For now, we'll return predefined references based on language
                const refs: Record<string, Array<{ title: string; url: string }>> = {
                    typescript: [
                        { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
                        { title: "TypeScript Deep Dive", url: "https://basarat.gitbook.io/typescript/" }
                    ],
                    javascript: [
                        { title: "MDN JavaScript Guide", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
                        { title: "JavaScript.info", url: "https://javascript.info/" }
                    ],
                    python: [
                        { title: "Python Documentation", url: "https://docs.python.org/3/" },
                        { title: "Real Python Tutorials", url: "https://realpython.com/" }
                    ],
                    java: [
                        { title: "Java Documentation", url: "https://docs.oracle.com/en/java/" },
                        { title: "Baeldung Java Guides", url: "https://www.baeldung.com/" }
                    ]
                };

                return refs[language.toLowerCase()] || [
                    { title: `${language} Documentation`, url: `https://example.org/docs/${language.toLowerCase()}` }
                ];
            };

            // Method implementations
            const chat = (input: CoderChatPipelineInput): Effect.Effect<CoderChatResponse, CoderChatPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Generating coding response for language: ${input.language || "general"}`);

                    // TODO: Replace with actual Phoenix MCP server call
                    // For now, using mock responses
                    const language = input.language || "javascript";

                    // Generate mock message based on user input
                    let responseMessage = `Here's some guidance on ${input.message}`;

                    // Check for common coding questions and provide more specific responses
                    if (input.message.toLowerCase().includes("function")) {
                        responseMessage = `Functions are blocks of reusable code. In ${language}, they can be defined in various ways depending on your needs. Here's how you can create and use functions effectively.`;
                    } else if (input.message.toLowerCase().includes("error")) {
                        responseMessage = `Error handling is crucial for robust applications. In ${language}, you can use try/catch patterns or promise-based error handling depending on your context.`;
                    } else if (input.message.toLowerCase().includes("api") || input.message.toLowerCase().includes("fetch")) {
                        responseMessage = `Making API calls in ${language} typically involves using fetch or a dedicated HTTP client library. I've included an example below that demonstrates best practices.`;
                    }

                    // Generate code examples if requested
                    const codeExamples = input.includeCode ? [
                        {
                            language,
                            ...getCodeExample(language, input.message)
                        }
                    ] : undefined;

                    // Include documentation references
                    const references = getDocumentationReferences(language);

                    // Create the response
                    return {
                        message: responseMessage,
                        codeExamples,
                        references
                    };
                }).pipe(
                    Effect.catchAllCause(causeObject => {
                        const underlyingError = Cause.squash(causeObject);
                        return Effect.fail(new CoderChatPipelineError({
                            message: `Failed to generate coding response: ${underlyingError instanceof Error ? underlyingError.message : String(underlyingError)}`,
                            cause: underlyingError
                        }));
                    })
                );

            const reviewCode = (
                code: string,
                language: string,
                _options?: Partial<Omit<CoderChatPipelineInput, "message">>
            ): Effect.Effect<CoderChatResponse, CoderChatPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Reviewing code in language: ${language}`);

                    // TODO: Replace with actual Phoenix MCP server call
                    // For now, using mock responses
                    const codeLines = code.split('\n').length;
                    const hasComments = code.includes('//') || code.includes('/*') || code.includes('#');
                    const hasErrorHandling = code.includes('try') || code.includes('catch') || code.includes('throw');

                    let reviewMessage = `I've reviewed your ${language} code (${codeLines} lines). `;

                    // Add feedback points
                    const feedbackPoints = [];

                    if (!hasComments) {
                        feedbackPoints.push("Consider adding comments to explain complex logic");
                    } else {
                        feedbackPoints.push("Good job including comments in your code");
                    }

                    if (!hasErrorHandling) {
                        feedbackPoints.push("Your code could benefit from error handling to make it more robust");
                    } else {
                        feedbackPoints.push("I like that you've included error handling in your code");
                    }

                    // Add language-specific feedback
                    if (language.toLowerCase() === 'typescript') {
                        if (!code.includes(':')) {
                            feedbackPoints.push("Consider adding type annotations to improve type safety");
                        } else {
                            feedbackPoints.push("Good use of TypeScript's type system");
                        }
                    }

                    if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
                        if (code.includes('var ')) {
                            feedbackPoints.push("Consider using 'let' or 'const' instead of 'var' for better scoping");
                        }
                    }

                    // Format the message
                    reviewMessage += `${feedbackPoints.join(". ")}.`;

                    // Add a suggestion for improvement with code example
                    const improvement = {
                        language,
                        code: `// Improved version of your code would include:\n${hasErrorHandling ? "" : "try {\n  // Your code here\n} catch (error) {\n  // Handle errors\n}\n"}`,
                        explanation: "This example shows how you might improve your code based on my review."
                    };

                    // Create the response
                    return {
                        message: reviewMessage,
                        codeExamples: [improvement],
                        references: getDocumentationReferences(language)
                    };
                }).pipe(
                    Effect.catchAllCause(causeObject => {
                        const underlyingError = Cause.squash(causeObject);
                        return Effect.fail(new CoderChatPipelineError({
                            message: `Failed to review code: ${underlyingError instanceof Error ? underlyingError.message : String(underlyingError)}`,
                            cause: underlyingError
                        }));
                    })
                );

            // Return implementation of the API
            return {
                chat,
                reviewCode
            };
        })
    }
) { }

/**
 * Layer for the CoderChatPipeline service
 */
export const CoderChatPipelineLayer = CoderChatPipelineService; 