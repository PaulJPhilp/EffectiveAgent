import { Context, Data, Effect, Exit, Fiber, Hub, Queue, Ref, Stream, Semaphore, HashMap } from "effect";

// Assuming LoggingService is available
import { type ILoggingService } from "../logging/types"; // Adjust path

// --- Runtime Status & Output Event Types ---

/** Runtime status of a managed Fiber */
export type FiberRuntimeStatus =
    | "Idle"      // Fiber exists, waiting for input
    | "Running"   // Fiber is actively processing
    | "Paused"    // Service logic prevents sending new input
    | "Completed" // Fiber finished its work successfully
    | "Failed"    // Fiber terminated due to an internal error
    | "Killed";   // Fiber was interrupted externally

/** Generic type for events published by managed Fibers via their Hub */
// Callers will likely use a more specific type based on their domain
export type FiberOutputEvent = unknown;

// --- Error Types ---

/** Error indicating the concurrency limit was reached when trying to start a Fiber. */
export class ConcurrencyLimitReached extends Data.TaggedError("ConcurrencyLimitReached")<{
    readonly message: string;
    readonly limit: number;
}> { }

/** Error indicating the specified Fiber ID was not found in the manager. */
export class FiberNotFound extends Data.TaggedError("FiberNotFound")<{
    readonly id: string;
    readonly message?: string;
}> { }

/** Error indicating an operation cannot be performed because the Fiber is paused. */
export class FiberPaused extends Data.TaggedError("FiberPaused")<{
    readonly id: string;
    readonly message?: string;
}> { }

/** General error for internal Fiber Manager issues (e.g., queue/hub errors, unexpected state). */
export class FiberManagerError extends Data.TaggedError("FiberManagerError")<{
    readonly message: string;
    readonly id?: string; // Optional ID if known
    readonly cause?: unknown;
}> { }

/** Union of errors potentially returned by FiberManagerService API methods. */
export type FiberManagerServiceError =
    | ConcurrencyLimitReached
    | FiberNotFound
    | FiberPaused
    | FiberManagerError;

// --- Internal State Structure (Conceptual) ---

/** Internal structure holding runtime state for a managed Fiber. */
export interface ManagedFiberState<Input, Output, E, A> {
    readonly id: string;
    readonly fiber: Fiber.Runtime<E, A>;
    readonly inputQueue: Queue.Queue<Input>;
    readonly outputHub: Hub.Hub<Output>;
    readonly statusRef: Ref.Ref<FiberRuntimeStatus>;
}

// --- Service Interface ---

/**
 * Defines the contract for the FiberManagerService.
 * Manages the lifecycle, concurrency, state, and communication
 * for background Effect Fibers identified by a string ID.
 */
export interface IFiberManagerService {
    /**
     * Starts a new managed Fiber to execute the provided Effect workflow.
     * The workflow receives an input Queue and an output Hub.
     * Enforces concurrency limits. Handles cleanup on termination.
     *
     * @template Input Type of items submitted via `submit`.
     * @template Output Type of events published by the Fiber via the output Hub.
     * @template E Error type of the `effectToRun`.
     * @template A Success type of the `effectToRun` (often `void` for long-running loops).
     * @param params Parameters including the unique ID, the Effect workflow, and an optional termination hook.
     * @returns Effect completing successfully (`void`) if startup is initiated (or Fiber already exists and is running),
     *          or failing with `ConcurrencyLimitReached` (if limit hit and configured to fail) or `FiberManagerError`.
     */
    readonly start: <Input, Output = FiberOutputEvent, E = Error, A = void>(params: {
        /** A unique identifier for this managed Fiber (e.g., threadId). */
        readonly id: string;
        /**
         * The Effect workflow the Fiber will execute. It receives the input Queue
         * and output Hub created for it. This Effect should typically contain its
         * own error handling logic; errors causing the Effect to fail will terminate the Fiber.
         */
        readonly effectToRun: (
            inputQueue: Queue.Queue<Input>,
            outputHub: Hub.Hub<Output>
        ) => Effect.Effect<A, E>;
        /**
         * An optional Effect to run *after* the Fiber terminates (successfully, with error, or via interruption).
         * Receives the Fiber ID and the final Exit status. Used for external cleanup (e.g., updating persistent state).
         * This hook runs *before* the semaphore permit is released. Errors in this hook are logged but do not prevent cleanup.
         */
        readonly onTerminate?: (id: string, exit: Exit.Exit<A, E>) => Effect.Effect<void>;
        /** Configuration for the internal Queue (e.g., capacity). Defaults may apply. */
        readonly queueOptions?: { readonly capacity?: number; /* other Queue options */ };
        /** Configuration for the internal Hub (e.g., capacity). Defaults may apply. */
        readonly hubOptions?: { readonly capacity?: number; /* other Hub options */ };
    }) => Effect.Effect<void, ConcurrencyLimitReached | FiberManagerError>;

    /**
     * Submits an input item to the specified Fiber's input queue.
     *
     * @template Input The type of the input item.
     * @param params Parameters including the Fiber ID and the input item.
     * @returns Effect completing successfully (`void`) if the item was queued, or failing with
     *          `FiberNotFound`, `FiberPaused`, or `FiberManagerError` (e.g., queue shutdown/full).
     */
    readonly submit: <Input>(params: {
        readonly id: string;
        readonly input: Input;
    }) => Effect.Effect<void, FiberNotFound | FiberPaused | FiberManagerError>;

    /**
     * Retrieves the current runtime status of the specified Fiber.
     *
     * @param params Parameters including the Fiber ID.
     * @returns Effect yielding the `FiberRuntimeStatus`, or failing with `FiberNotFound`.
     */
    readonly getStatus: (params: {
        readonly id: string;
    }) => Effect.Effect<FiberRuntimeStatus, FiberNotFound>;

    /**
     * Sets the runtime status of the Fiber to "Paused", preventing `submit` from queuing new items.
     * Does not interrupt the Fiber's current work.
     *
     * @param params Parameters including the Fiber ID.
     * @returns Effect completing successfully (`void`), or failing with `FiberNotFound` or `FiberManagerError`.
     */
    readonly pause: (params: {
        readonly id: string;
    }) => Effect.Effect<void, FiberNotFound | FiberManagerError>;

    /**
     * Sets the runtime status of the Fiber from "Paused" back to "Idle" (or appropriate state),
     * allowing `submit` to queue new items again.
     *
     * @param params Parameters including the Fiber ID.
     * @returns Effect completing successfully (`void`), or failing with `FiberNotFound` or `FiberManagerError`.
     */
    readonly resume: (params: {
        readonly id: string;
    }) => Effect.Effect<void, FiberNotFound | FiberManagerError>;

    /**
     * Interrupts the specified Fiber.
     * Cleanup (releasing semaphore, calling `onTerminate`, removing state) is handled
     * automatically via the logic set up during `start`.
     *
     * @param params Parameters including the Fiber ID.
     * @returns Effect completing successfully (`void`) once interruption is signaled, or failing with
     *          `FiberNotFound` or `FiberManagerError` (if interruption signal fails).
     */
    readonly interrupt: (params: {
        readonly id: string;
    }) => Effect.Effect<void, FiberNotFound | FiberManagerError>;

    /**
     * Subscribes to the output event Hub for the specified Fiber.
     * Returns a `Stream` of events published by the Fiber's workflow.
     * The stream completes when the Hub is shut down (which happens on Fiber termination).
     *
     * @template Output The expected type of events on the Hub.
     * @param params Parameters including the Fiber ID.
     * @returns Effect yielding a `Stream<Output, never>`, or failing with `FiberNotFound`.
     */
    readonly subscribe: <Output = FiberOutputEvent>(params: {
        readonly id: string;
    }) => Effect.Effect<Stream.Stream<Output>, FiberNotFound>;

    /**
     * Retrieves the current number of active Fibers being managed. Useful for monitoring.
     */
    readonly getActiveFiberCount: () => Effect.Effect<number>;
}

// --- Service Tag ---

/**
 * Effect Tag for the FiberManagerService. Use this internal service
 * to manage background Fiber execution.
 */
export class FiberManagerService extends Context.Tag("FiberManagerService")<
    FiberManagerService,
    IFiberManagerService
>() { }
