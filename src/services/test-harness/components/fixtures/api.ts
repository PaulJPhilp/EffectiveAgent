import { type Span, Tracer } from "effect/Tracer";
import { Context, Effect, Layer } from "effect";
import type { EmbeddingGenerationOptions, EmbeddingGenerationResult } from "@/services/ai/producers/embedding/service.js";

/**
 * Common schema types for object generation tests
 */
export interface PersonSchema {
  name: string;
  age: number;
  email?: string;
}

export interface ProductSchema {
  id: string;
  name: string;
  price: number;
  description?: string;
  inStock: boolean;
}

export interface TaskSchema {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: number;
}

/**
 * Defines the API for accessing standard fixtures provided by the test harness.
 * Fixtures are pre-configured data or objects useful for setting up test scenarios.
 */
export interface FixtureApi {
  /**
   * Provides a standard mock tracing span.
   * Useful for testing components that interact with tracing or require a span context.
   */
  readonly mockSpan: Span;

  /**
   * Provides common test fixtures for producer services.
   * These fixtures can be used for standardized testing of producer services.
   */
  readonly producerFixtures: {
    /**
     * Common test inputs for various producer services.
     */
    validInputs: {
      /**
       * Valid text input for text generation.
       */
      text: string;
      
      /**
       * Valid embedding inputs (both string and array variants).
       */
      embedding: {
        single: string;
        multiple: string[];
      };
      
      /**
       * Valid image generation input.
       */
      image: {
        prompt: string;
        size: string;
        negativePrompt: string;
      };
      
      /**
       * Valid object generation input.
       */
      object: {
        prompt: string;
      };
      
      /**
       * Valid transcription input.
       */
      transcription: {
        audioData: string;
      };
      
      /**
       * Valid chat input.
       */
      chat: {
        messages: Array<{ role: string; content: string }>;
        system: string;
      };
    };
    
    /**
     * Common test schemas for object generation.
     */
    schemas: {
      /**
       * Creates a schema for a Person object.
       */
      createPersonSchema: () => unknown;
      
      /**
       * Creates a schema for a Product object.
       */
      createProductSchema: () => unknown;
      
      /**
       * Creates a schema for a Task object.
       */
      createTaskSchema: () => unknown;
      
      /**
       * Creates a schema for a list of objects.
       * @param itemSchema The schema for the list items.
       */
      createListSchema: (itemSchema: unknown) => unknown;
    };
    
    /**
     * Common mock responses for producer services.
     */
    mockResponses: {
      /**
       * Mock embedding generation result.
       */
      embedding: {
        embeddings: ReadonlyArray<ReadonlyArray<number>>;
        model: string;
        timestamp: Date;
        id: string;
        usage: {
          promptTokens: number;
          totalTokens: number;
        };
      };
      
      /**
       * Mock text generation result.
       */
      text: {
        text: string;
        model: string;
        timestamp: Date;
        id: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
        finishReason: string;
      };
      
      /**
       * Mock image generation result.
       */
      image: {
        imageUrl: string;
        model: string;
        timestamp: Date;
        id: string;
        parameters: {
          size: string;
          quality: string;
          style: string;
        };
        additionalImages?: Array<{
          imageUrl: string;
          id: string;
        }>;
      };
      
      /**
       * Mock object generation result.
       */
      object: {
        data: unknown;
        model: string;
        timestamp: Date;
        id: string;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
      };
      
      /**
       * Mock transcription result.
       */
      transcription: {
        text: string;
        model: string;
        timestamp: Date;
        id: string;
        segments: Array<{
          id: number;
          start: number;
          end: number;
          text: string;
          confidence: number;
        }>;
        detectedLanguage: string;
        duration: number;
        usage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
      };
    };
  };
}
