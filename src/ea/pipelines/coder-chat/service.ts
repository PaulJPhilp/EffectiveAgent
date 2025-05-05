/**
 * @file Service implementation for the CoderChatPipeline
 * @module ea/pipelines/coder-chat/service
 */

import { Context, Effect } from "effect";
import {
    CoderChatPipeline,
    type CoderChatPipelineApi,
    CoderChatPipelineError,
    type CoderChatPipelineInput,
    type CoderChatResponse
} from "./contract.js";

// Dependencies
class EaLlmProvider extends Context.Tag("EaLlmProvider")<EaLlmProvider, any>() { }
class LanguageToolProvider extends Context.Tag("LanguageToolProvider")<LanguageToolProvider, any>() { }
class DocumentationService extends Context.Tag("DocumentationService")<DocumentationService, any>() { }

/**
 * Implementation of the CoderChatPipeline service
 */
export class CoderChatPipelineService extends Effect.Service<CoderChatPipelineApi>()(
    CoderChatPipeline,
    {
        effect: Effect.gen(function* (_) {
            // Yield dependencies
            const llm = yield* _(EaLlmProvider);
            const languageTool = yield* _(LanguageToolProvider);
            const documentation = yield* _(DocumentationService);

            // Helper to get language-specific examples
            const getCodeExample = (language: string, prompt: string): { code: string; explanation: string } => {
                // In a real implementation, this would use the language tool or LLM
                // For now, we'll return predefined examples based on language
                const examples: Record<string, { code: string; explanation: string }> = {
                    typescript: {
                        code: `interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction getUserInfo(userId: string): Promise<User> {\n  return fetch(\`/api/users/\${userId}\`)\n    .then(response => {\n      if (!response.ok) {\n        throw new Error(\`Failed to fetch user: \${response.statusText}\`);\n      }\n      return response.json();\n    });\n}`,
                        explanation: "This TypeScript example shows how to define an interface and use it in a typed function that fetches user data asynchronously."
                    },
                    javascript: {
                        code: `function fetchUserData(userId) {\n  return fetch(\`/api/users/\${userId}\`)\n    .then(response => {\n      if (!response.ok) {\n        throw new Error(\`Failed to fetch user: \${response.statusText}\`);\n      }\n      return response.json();\n    })\n    .then(data => {\n      console.log('User data:', data);\n      return data;\n    })\n    .catch(error => {\n      console.error('Error fetching user:', error);\n      throw error;\n    });\n}`,
                        explanation: "This JavaScript function demonstrates proper error handling in asynchronous API calls using promises."
                    },
                    python: {
                        code: `import requests\n\ndef get_user_data(user_id):\n    try:\n        response = requests.get(f\"https://api.example.com/users/{user_id}\")\n        response.raise_for_status()\n        return response.json()\n    except requests.exceptions.HTTPError as e:\n        print(f\"HTTP Error: {e}\")\n    except requests.exceptions.RequestException as e:\n        print(f\"Error fetching user data: {e}\")\n    return None`,
                        explanation: "This Python function shows how to make HTTP requests with proper error handling using the requests library."
                    },
                    java: {
                        code: `public class UserService {\n    private final HttpClient httpClient;\n    \n    public UserService() {\n        this.httpClient = HttpClient.newBuilder()\n            .version(HttpClient.Version.HTTP_2)\n            .build();\n    }\n    \n    public CompletableFuture<User> getUserById(String userId) {\n        HttpRequest request = HttpRequest.newBuilder()\n            .uri(URI.create(\"https://api.example.com/users/\" + userId))\n            .GET()\n            .build();\n            \n        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())\n            .thenApply(HttpResponse::body)\n            .thenApply(this::parseUserJson);\n    }\n    \n    private User parseUserJson(String json) {\n        // Parse JSON and create User object\n        return new User(); // Simplified for example\n    }\n}`,
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
                // In a real implementation, this would use the documentation service
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
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Generating coding response for language: ${input.language || "general"}`));

                    try {
                        // In a real implementation, this would:
                        // 1. Process the user's message
                        // 2. Use the LLM to generate a response
                        // 3. Use language tools to validate or enhance code examples
                        // 4. Fetch relevant documentation

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
                        return yield* _(Effect.succeed({
                            message: responseMessage,
                            codeExamples,
                            references
                        }));
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new CoderChatPipelineError({
                                    message: `Failed to generate coding response: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            const reviewCode = (
                code: string,
                language: string,
                options?: Partial<Omit<CoderChatPipelineInput, "message">>
            ): Effect.Effect<CoderChatResponse, CoderChatPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Reviewing code in language: ${language}`));

                    try {
                        // In a real implementation, this would:
                        // 1. Analyze the code using language-specific tools
                        // 2. Use the LLM to generate insights
                        // 3. Provide specific recommendations

                        // Generate mock review based on language and code length
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
                        reviewMessage += feedbackPoints.join(". ") + ".";

                        // Add a suggestion for improvement with code example
                        const improvement = {
                            language,
                            code: "// Improved version of your code would include:\n" +
                                (hasErrorHandling ? "" : "try {\n  // Your code here\n} catch (error) {\n  // Handle errors\n}\n"),
                            explanation: "This example shows how you might improve your code based on my review."
                        };

                        // Create the response
                        return yield* _(Effect.succeed({
                            message: reviewMessage,
                            codeExamples: [improvement],
                            references: getDocumentationReferences(language)
                        }));
                    } catch (error) {
                        return yield* _(
                            Effect.fail(
                                new CoderChatPipelineError({
                                    message: `Failed to review code: ${error instanceof Error ? error.message : String(error)}`,
                                    cause: error
                                })
                            )
                        );
                    }
                });

            // Return implementation of the API
            return {
                chat,
                reviewCode
            };
        }),

        // List dependencies required by the 'effect' factory
        dependencies: [EaLlmProvider, LanguageToolProvider, DocumentationService]
    }
) { }

/**
 * Layer for the CoderChatPipeline service
 */
export const CoderChatPipelineLayer = CoderChatPipelineService; 