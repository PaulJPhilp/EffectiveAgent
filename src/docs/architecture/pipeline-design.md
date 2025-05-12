Okay, Paul, let's consolidate this refined design into a new version of the design document. This will incorporate `Blueprint.extend` and the specific rules for element merging and executor handling.

---

# Pipeline System Design Document (Draft)

**Version:** 0.2
**Date:** 5/8/2025

## 1. Introduction

This document outlines the design for a composable pipeline system within the Effect-TS ecosystem. The goal is to provide a clear, type-safe, and developer-friendly way to define reusable pipeline blueprints, specialize them through extension, configure them with specific parameters, and execute them as Effect-based workflows. The design emphasizes a declarative approach, inspired by Effect CLI, for defining configurable elements.

## 2. Core Concepts & Terminology

The system revolves around the following key concepts:

*   **`PipelineElement` Descriptors (`ElementDescriptor`)**: Atomic specifications for individual configurable logical elements of a pipeline (e.g., a model ID, a temperature setting, a required service, a list of tool names).
*   **`BlueprintElements` Object**: A plain JavaScript object that serves as a collection of `ElementDescriptor`s. It defines the complete set of configurable logical elements for a `PipelineBlueprint`.
*   **`PipelineBlueprint` (`BlueprintInstance`)**: A reusable template or master plan for a pipeline. It's defined by a `BlueprintElements` object and an `executorFactory` function that specifies the pipeline's core execution logic. Blueprints can be extended to create more specialized blueprints.
*   **`ExecutablePipeline`**: A concrete, runnable instance derived from a `PipelineBlueprint` by providing specific values for its defined elements via a `.build()` method. It exposes an `execute` method that returns an `Effect`.

## 3. Detailed Design

### 3.1. `PipelineElement` Descriptors

`PipelineElement` descriptors are the atomic units for defining the configurable aspects of a `PipelineBlueprint`. They specify the name (key), type, validation rules, optionality, and default values for each piece of configuration.

*   **Factory Namespace/Object:** `PipelineElement` (e.g., `PipelineElement.string()`)
*   **Factory Methods (Examples):**
    *   `PipelineElement.string(elementName?: string): StringElementDescriptor`
    *   `PipelineElement.number(elementName?: string): NumberElementDescriptor`
    *   `PipelineElement.boolean(elementName?: string): BooleanElementDescriptor`
    *   `PipelineElement.array<T>(itemElementDescriptor: ElementDescriptor<T>, elementName?: string): ArrayElementDescriptor<T[]>`
    *   `PipelineElement.service<Svc, Cls extends { readonly name: string } & Function>(serviceClass: Cls, elementName?: string): ServiceElementDescriptor<Svc>` (Stores the service class for later `yield* serviceClass`.)
*   **Descriptor Refining Methods (Chainable):**
    *   `.withDefault(value: A): this` (Stores the default value/provider function).
    *   `.asOptional(): ElementDescriptor<A | undefined>` (Marks the element as optional; resolved value will be `A | undefined`).
    *   `.describedAs(description: string): this`
*   **Internal Structure of an `ElementDescriptor<A>` (Conceptual):**
    *   `name`: The key this element will have in the configuration object (can be inferred from the key in the `BlueprintElements` object if `elementName` is not provided to the factory).
    *   `schema`: An internal `@effect/schema/Schema<A>` instance for validation, parsing, and type information. This schema is constructed/modified by the factory and refining methods (e.g., `asOptional` wraps the schema, `withDefault` influences parsing).
    *   `description`: Optional textual description.
    *   `elementType`: A discriminant (e.g., "string", "number", "array", "service") to aid `Blueprint.extend` logic.
    *   `getDefaultValue(): A | undefined`: Method to retrieve the processed default value.
    *   `getRawDefaultConfig(): any`: Method to retrieve the raw default configuration (e.g., the array of strings for `toolNames` defaults) for merging purposes.
    *   `isOptionalFlag`: Boolean indicating optionality.

**Example `BlueprintElements` Object:**

```typescript
import { PipelineElement } from "./pipeline";
import { TextProducerService } from "@/services/ai/producers/text"; // Example Service Class

const textPipelineElements = {
    model:         PipelineElement.string("modelId").describedAs("The AI model ID."),
    temperature:   PipelineElement.number("temperature").withDefault(0.7),
    systemMessage: PipelineElement.string("systemMessage").asOptional(),
    toolNames:     PipelineElement.array(PipelineElement.string(), "tools").withDefaults(["common/defaultTool"]).asOptional(),
    aiService:     PipelineElement.service(TextProducerService, "textProducer")
};
// This object defines the configurable interface of a blueprint.
```

### 3.2. `PipelineBlueprint` (`BlueprintInstance`)

A `PipelineBlueprint` is a reusable template.

*   **Type Alias for Element Collections:**
    `export type BlueprintElements = Record<string, ElementDescriptor<any>>;`
*   **Type Alias for Resolved Element Values:**
    `export type ResolvedBlueprintElements<BE extends BlueprintElements> = { [K in keyof BE]: BE[K]["_A"]; };` (where `_A` is the inferred type from the descriptor)
*   **`BlueprintInstance` Interface:**
    ```typescript
    interface BlueprintInstance<
        Elements extends BlueprintElements,
        InputType,
        OutputType,
        ErrorType,
        RequirementsType
    > {
        readonly elementsDefinition: Elements; // Stores the (possibly merged) element descriptors
        readonly executorFactory: ( // Stores the executorFactory for this blueprint
            resolvedValues: ResolvedBlueprintElements<Elements>
        ) => (runtimeInput: InputType) => Effect.Effect<OutputType, ErrorType, RequirementsType>;

        readonly build: ( // Method to create an ExecutablePipeline
            chosenElementValues: Partial<ResolvedBlueprintElements<Elements>> // User provides values for elements
        ) => ExecutablePipeline<InputType, OutputType, ErrorType, RequirementsType>;
    }
    ```
*   **Factory Object:** `Blueprint`
    *   **`Blueprint.make<Elements, I, O, E, R>(elements: Elements, executorFactory): BlueprintInstance<Elements, I, O, E, R>`**
        *   `elements`: A `BlueprintElements` object.
        *   `executorFactory`: Function `(resolvedValues) => (runtimeInput) => Effect`.
        *   The `build` method on the returned `BlueprintInstance` will:
            1.  Validate `chosenElementValues` against `elements`.
            2.  Apply default values from `elements` for unspecified optional elements.
            3.  Produce the `resolvedValues` object.
            4.  Call the stored `executorFactory` with `resolvedValues` to get the pipeline's `execute` function.
            5.  Return an `ExecutablePipeline` containing this `execute` function.

    *   **`Blueprint.extend<BaseE, ExtE, FinalI, FinalO, FinalE_err, FinalR>(baseBlueprint: BlueprintInstance<BaseE, any, any, any, any>, extensionElements: ExtE, newExecutorFactory: ExecutorFactoryForMerged): BlueprintInstance<MergedE, FinalI, FinalO, FinalE_err, FinalR>`**
        *   `baseBlueprint`: The blueprint to extend.
        *   `extensionElements`: A `BlueprintElements` object defining new elements or the `toolNames` element for accumulation.
        *   `newExecutorFactory`: A **new, complete** executor factory for the specialized blueprint. It will receive `resolvedElementValues` for the *fully merged set of elements*.
        *   **Merging Logic:**
            1.  Start with elements from `baseBlueprint.elementsDefinition`.
            2.  For each element in `extensionElements`:
                *   If the element key is the designated "tool names" key (e.g., `"toolNames"`) and is an `array` type in both base and extension:
                    *   The `defaultValues` from the base and extension descriptors are combined (e.g., array concatenation/union).
                    *   The descriptor from `extensionElements` (with the newly combined defaults) replaces the base descriptor for this key.
                *   If the element key exists in the base blueprint and is *not* the "tool names" key:
                    *   **The `extend` operation fails (throws a runtime error).** Duplicate non-tool element keys are disallowed to enforce explicitness.
                *   If the element key is new:
                    *   The descriptor from `extensionElements` is added.
            3.  The resulting merged set of element descriptors and the `newExecutorFactory` are used to create and return a new `BlueprintInstance` (effectively by calling `Blueprint.make` internally with these combined parts).

### 3.3. `ExecutablePipeline`

An `ExecutablePipeline` is a concrete, configured instance of a `Blueprint`, ready to be executed.

*   **Interface:**
    ```typescript
    interface ExecutablePipeline<InputType, OutputType, ErrorType, RequirementsType> {
        readonly execute: (input: InputType) => Effect.Effect<OutputType, ErrorType, RequirementsType>;
        // readonly resolvedElements: ResolvedBlueprintElements<Elements>; // Optionally expose resolved config
    }
    ```
*   **Creation:** Returned by the `blueprintInstance.build(chosenElementValues)` method.

## 4. Composability & Specialization

*   **Specialization ("Extends"):**
    Achieved via `Blueprint.extend()`. This allows creating new blueprints that inherit and modify the configurable elements of a base blueprint. Tool defaults are accumulated; other element key duplications are disallowed. The specialized blueprint provides its own complete `executorFactory`.
*   **Configuration Composability ("Partial Pipelines"):**
    Achieved by creating functions or constants that provide partial `chosenElementValues` objects. These can then be spread and augmented with other values before being passed to a `blueprintInstance.build()` method.
*   **Execution Composability (Output of one to Input of another):**
    Achieved via standard Effect composition, as `executablePipeline.execute()` returns an `Effect`.

## 5. Tool Integration

*   Tools are configured via a `PipelineElement.array(PipelineElement.string(), "toolNames")` (or similar agreed-upon key and type) within a `BlueprintElements` object.
*   The user provides an array of tool names (strings referencing tools in a registry) when calling `.build()`.
*   The `executorFactory` for a tool-aware blueprint is responsible for:
    *   Depending on a `ToolRegistryProvider` service (via `PipelineElement.service`).
    *   Using the resolved list of tool names to fetch full `ToolDefinition`s (metadata and executable implementation) from the registry.
    *   Interacting with an AI service capable of tool use, providing it with tool metadata and a way to dispatch tool execution calls.
*   Tool default accumulation during `Blueprint.extend` is handled as described in section 3.2.

## 6. Open Questions / Future Considerations

*   Precise internal implementation of `PipelineElement` descriptors, especially methods like `getRawDefaultConfig()` and how `withDefault()`/`asOptional()` modify the internal schema and properties.
*   Detailed error handling strategy for configuration errors during `.build()` (e.g., validation failures, missing required elements not covered by defaults).
*   Compile-time type safety for `Blueprint.extend` to prevent disallowed duplicate keys in `extensionElements`.
*   Strategy for composing/wrapping `executorFactory` logic in `Blueprint.extend` (currently requires a new factory; V2 could explore wrappers).
*   Final decision on whether `asOptional()` results in `A | undefined` or `EffectOption.Option<A>` for the resolved value type (current preference: `A | undefined`).

---

This version incorporates the `Blueprint.extend` mechanism with the specified merging rules and the requirement for a new executor factory. It also clarifies the role of `PipelineElement` and the overall flow.

How does this V0.2 draft feel, Paul?


import * as S from "@effect/schema/Schema";
import { Effect, Either } from "effect";

// --- Blueprint ---

/**
 * Defines the configuration parameters accepted by a Blueprint using S.Schema.
 * Keys are parameter names, values are their Schema definitions.
 * Example: { model: S.string, temp: S.optional(S.number).pipe(S.withDefault(() => 0.7)) }
 */
export type BlueprintSchema = Record<string, S.Schema<any>>;

/**
 * Represents a Blueprint definition. Holds the configuration schema.
 * Contains no execution logic.
 */
export interface Blueprint<Schema extends BlueprintSchema> {
  /**
   * The definition of configuration parameters for this Blueprint.
   */
  readonly definition: Schema;
}

/**
 * Functions for creating and extending Blueprints.
 */
export interface BlueprintStatic {
  /**
   * Creates a base Blueprint from a configuration schema definition.
   */
  make<Schema extends BlueprintSchema>(definition: Schema): Blueprint<Schema>;

  /**
   * Creates a specialized Blueprint by extending a base Blueprint.
   * Merges schemas: 'toolNames' defaults accumulate, other duplicates fail.
   */
  extend<BaseSchema extends BlueprintSchema, ExtSchema extends BlueprintSchema>(
    baseBlueprint: Blueprint<BaseSchema>,
    extensionSchema: ExtSchema,
  ): Blueprint<Omit<BaseSchema, keyof ExtSchema> & ExtSchema>; // Simplified merged type
}

// --- Pipeline ---

/**
 * Represents a runnable Pipeline instance.
 * Holds execution logic and uses a resolved configuration.
 */
export interface Pipeline<
  InputType = any,
  OutputType = any,
  ErrorType = any,
  RequirementsType = any,
> {
  /**
   * Executes the pipeline's logic.
   * @returns An Effect representing the execution.
   */
  execute: (
    input: InputType,
  ) => Effect.Effect<OutputType, ErrorType, RequirementsType>;
}

/**
 * Describes a function that creates a Pipeline instance.
 * It validates user-provided values against a Blueprint definition.
 */
export interface PipelineFactory<
  Schema extends BlueprintSchema, // The Blueprint schema this factory uses
  InputType = unknown,
  OutputType = unknown,
  ErrorType = unknown,
  RequirementsType = never,
> {
  /**
   * Creates a Pipeline instance.
   * @param blueprint The Blueprint defining the expected configuration.
   * @param values The user-provided configuration values for this instance.
   * @returns An Either containing the Pipeline instance or a configuration error.
   */
  (
    blueprint: Blueprint<Schema>,
    // User provides values matching the schema's input types (before defaults/optional)
    // Using 'any' here simplifies the interface definition, implementation needs stricter types.
    values: S.Schema.From<S.Struct<Schema>> | Record<string, any>, // Input values from user
  ): Either.Either<
    S.ParseError,
    Pipeline<InputType, OutputType, ErrorType, RequirementsType>
  >;
}
