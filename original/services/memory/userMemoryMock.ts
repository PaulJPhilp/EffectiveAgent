// src/testing/mocks.ts (Extend or create this file)
import { Effect, Layer, LogLevel, Logger, Option, ReadonlyArray } from "effect";
import { vi } from "vitest";

// --- Logging Mock (Reuse from previous example) ---
export const mockLogger = { /* ... same as before ... */ };
export class MockLoggingService implements ILoggingService { /* ... same as before ... */ }
export const MockLoggingServiceLayer = Layer.succeed(LoggingService, new MockLoggingService());

// --- Repository Mock ---
import {
    type IRepositoryService,
    type BaseEntity,
    type FindCriteria,
    type UpdateData,
    type FindByIdCriteria,
    RepositoryService, // Assuming the Tag is exported
    type CreateEffect,
    type FindEffect,
    type FindManyEffect,
    type UpdateEffect,
    type DeleteEffect,
} from "../repository/repository-service"; // Adjust path
import {
    DataValidationError as RepoDataValidationError,
    EntityNotFoundError as RepoEntityNotFoundError,
    RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path
import { type UserMemoryEntryData } from "../memory/longterm/longterm-memory-service"; // Adjust path (where UserMemoryEntryData is defined)
import { LoggingService } from "../logging/types/index.ts";

// Simple in-memory store for the mock repository
const mockDb = new Map<string, BaseEntity<UserMemoryEntryData>>();
let idCounter = 0;

export class MockUserRepositoryService
    implements IRepositoryService<UserMemoryEntryData> {
    // Helper to reset DB for tests
    reset() {
        mockDb.clear();
        idCounter = 0;
    }

    create = vi.fn(
        (data: UserMemoryEntryData): CreateEffect<UserMemoryEntryData> => {
            // Simulate basic validation error
            if (!data.userId || !data.key) {
                return Effect.fail(
                    new RepoDataValidationError({
                        message: "Mock Repo: userId and key are required",
                    })
                );
            }
            // Simulate unique constraint violation (userId + key)
            for (const entry of mockDb.values()) {
                if (entry.data.userId === data.userId && entry.data.key === data.key) {
                    return Effect.fail(
                        new RepoError({
                            message: `Mock Repo: Unique constraint violation for userId=${data.userId}, key=${data.key}`,
                        })
                    );
                }
            }

            const newId = `mock-id-${++idCounter}`;
            const now = new Date();
            const newEntity: BaseEntity<UserMemoryEntryData> = {
                id: newId,
                data: { ...data }, // Clone data
                createdAt: now,
                updatedAt: now,
            };
            mockDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        }
    );

    findById = vi.fn(
        (criteria: FindByIdCriteria): FindEffect<UserMemoryEntryData> => {
            const entity = mockDb.get(criteria.id);
            if (entity) {
                return Effect.succeed(entity);
            } else {
                return Effect.fail(
                    new RepoEntityNotFoundError({
                        entityId: criteria.id,
                        message: `Mock Repo: Entity not found with id ${criteria.id}`,
                    })
                );
            }
        }
    );

    find = vi.fn(
        (criteria: FindCriteria<UserMemoryEntryData>): FindManyEffect<UserMemoryEntryData> => {
            const results: BaseEntity<UserMemoryEntryData>[] = [];
            mockDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    if (
                        Object.prototype.hasOwnProperty.call(criteria, key) &&
                        entity.data[key as keyof UserMemoryEntryData] !==
                        criteria[key as keyof UserMemoryEntryData]
                    ) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    results.push(entity);
                }
            });
            return Effect.succeed(results);
            // Add sorting/limiting simulation if needed later
        }
    );

    update = vi.fn(
        (id: string, data: UpdateData<UserMemoryEntryData>): UpdateEffect<UserMemoryEntryData> => {
            const entity = mockDb.get(id);
            if (!entity) {
                return Effect.fail(
                    new RepoEntityNotFoundError({
                        entityId: id,
                        message: `Mock Repo: Entity not found for update with id ${id}`,
                    })
                );
            }
            // Simulate potential validation error on update data
            if (data.value === "INVALID_UPDATE_VALUE") {
                return Effect.fail(
                    new RepoDataValidationError({
                        message: "Mock Repo: Invalid value provided for update",
                    })
                );
            }

            const updatedData = { ...entity.data, ...data };
            const updatedEntity: BaseEntity<UserMemoryEntryData> = {
                ...entity,
                data: updatedData,
                updatedAt: new Date(),
            };
            mockDb.set(id, updatedEntity);
            return Effect.succeed(updatedEntity);
        }
    );

    delete = vi.fn((id: string): DeleteEffect => {
        if (mockDb.has(id)) {
            mockDb.delete(id);
            return Effect.void;
        } else {
            return Effect.fail(
                new RepoEntityNotFoundError({
                    entityId: id,
                    message: `Mock Repo: Entity not found for delete with id ${id}`,
                })
            );
        }
    });
}

// Layer providing the mock repository specifically typed for UserMemoryEntryData
export const MockUserRepositoryLayer = Layer.succeed(
    RepositoryService, // Provide the generic tag
    new MockUserRepositoryService() as IRepositoryService<UserMemoryEntryData> // Cast to specific type if needed by consumer, though Tag is generic
);

// Updated helper to get mocks
export const getMockServices = Effect.all({
    logSvc: LoggingService,
    repoSvc: RepositoryService, // Will resolve to MockUserRepositoryService instance
});
