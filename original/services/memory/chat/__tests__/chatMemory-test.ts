// src/testing/mocks.ts (Extend or create this file)
import { Effect, Layer, LogLevel, Logger, Option, ReadonlyArray } from "effect";
import { vi } from "vitest";

// --- Logging Mock (Reuse) ---
export const mockLogger = { /* ... */ };
export class MockLoggingService implements ILoggingService { /* ... */ }
export const MockLoggingServiceLayer = Layer.succeed(LoggingService, new MockLoggingService());

import {
    type ChatMessageEntityData, type SummarizationMetadataEntityData
} from "../memory/chat/chat-memory-service"; // Adjust path
import {
    DataValidationError as RepoDataValidationError,
    EntityNotFoundError as RepoEntityNotFoundError,
    RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path
// --- Repository Mock (Handling Multiple Entity Types) ---
import {type BaseEntity, type CreateEffect, type DeleteEffect,
    type FindByIdCriteria, type FindCriteria, type FindEffect,
    type FindManyEffect, 
    type IRepositoryService, RepositoryService, type UpdateData,type UpdateEffect, 
} from "../repository/repository-service"; // Adjust path

// Use separate maps for different entity types in the mock
const mockChatMessageDb = new Map<string, BaseEntity<ChatMessageEntityData>>();
const mockSummaryMetaDb = new Map<string, BaseEntity<SummarizationMetadataEntityData>>();
let chatMsgIdCounter = 0;
let summaryMetaIdCounter = 0;

// Type guard to check entity type (simple version based on expected keys)
function isChatMessageData(data: any): data is ChatMessageEntityData {
    return typeof data === 'object' && data !== null && 'role' in data && 'content' in data && 'conversationId' in data;
}
function isSummaryMetaData(data: any): data is SummarizationMetadataEntityData {
    return typeof data === 'object' && data !== null && 'summarizedMessageIds' in data && 'conversationId' in data;
}


export class MockMultiTypeRepositoryService implements IRepositoryService<any> { // Use 'any' here, logic will differentiate
    reset() {
        mockChatMessageDb.clear();
        mockSummaryMetaDb.clear();
        chatMsgIdCounter = 0;
        summaryMetaIdCounter = 0;
    }

    create = vi.fn((data: any): CreateEffect<any> => {
        const now = new Date();
        if (isChatMessageData(data)) {
            const newId = `mock-chat-${++chatMsgIdCounter}`;
            const newEntity: BaseEntity<ChatMessageEntityData> = { id: newId, data: { ...data }, createdAt: now, updatedAt: now };
            mockChatMessageDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        } else if (isSummaryMetaData(data)) {
            const newId = `mock-meta-${++summaryMetaIdCounter}`;
            const newEntity: BaseEntity<SummarizationMetadataEntityData> = { id: newId, data: { ...data }, createdAt: now, updatedAt: now };
            mockSummaryMetaDb.set(newId, newEntity);
            return Effect.succeed(newEntity);
        }
        return Effect.fail(new RepoError({ message: "Mock Repo: Unknown data type for create" }));
    });

    findById = vi.fn((criteria: FindByIdCriteria): FindEffect<any> => {
        // Check both maps - assumes IDs are unique across types for simplicity here
        const chatEntity = mockChatMessageDb.get(criteria.id);
        if (chatEntity) return Effect.succeed(chatEntity);
        const metaEntity = mockSummaryMetaDb.get(criteria.id);
        if (metaEntity) return Effect.succeed(metaEntity);
        return Effect.fail(new RepoEntityNotFoundError({ entityId: criteria.id, message: `Mock Repo: Entity not found with id ${criteria.id}` }));
    });

    find = vi.fn((criteria: FindCriteria<any>): FindManyEffect<any> => {
        const results: BaseEntity<any>[] = [];
        // Determine which DB to search based on criteria keys, or search both if ambiguous
        const looksLikeChatCriteria = 'role' in criteria || ('conversationId' in criteria && !('summarizedMessageIds' in criteria));
        const looksLikeMetaCriteria = 'summarizedMessageIds' in criteria || ('conversationId' in criteria && !('role' in criteria));

        if (looksLikeChatCriteria || !looksLikeMetaCriteria) { // Default to searching chat messages if ambiguous
            mockChatMessageDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    if (entity.data[key as keyof ChatMessageEntityData] !== criteria[key as keyof ChatMessageEntityData]) {
                        match = false; break;
                    }
                }
                if (match) results.push(entity);
            });
        }
        if (looksLikeMetaCriteria || !looksLikeChatCriteria) { // Search metadata too if criteria fit or ambiguous
            mockSummaryMetaDb.forEach((entity) => {
                let match = true;
                for (const key in criteria) {
                    if (entity.data[key as keyof SummarizationMetadataEntityData] !== criteria[key as keyof SummarizationMetadataEntityData]) {
                        match = false; break;
                    }
                }
                if (match) results.push(entity);
            });
        }
        return Effect.succeed(results);
    });

    update = vi.fn((id: string, data: UpdateData<any>): UpdateEffect<any> => {
        // Check both maps
        if (mockChatMessageDb.has(id)) {
            const entity = mockChatMessageDb.get(id)!;
            const updatedEntity: BaseEntity<ChatMessageEntityData> = { ...entity, data: { ...entity.data, ...data }, updatedAt: new Date() };
            mockChatMessageDb.set(id, updatedEntity);
            return Effect.succeed(updatedEntity);
        } else if (mockSummaryMetaDb.has(id)) {
            const entity = mockSummaryMetaDb.get(id)!;
            // Add specific validation if needed, e.g., ensuring summaryMessageId is string
            if ('summaryMessageId' in data && typeof data.summaryMessageId !== 'string') {
                return Effect.fail(new RepoDataValidationError({ message: "Mock Repo: Invalid summaryMessageId for update" }));
            }
            const updatedEntity: BaseEntity<SummarizationMetadataEntityData> = { ...entity, data: { ...entity.data, ...data }, updatedAt: new Date() };
            mockSummaryMetaDb.set(id, updatedEntity);
            return Effect.succeed(updatedEntity);
        }
        return Effect.fail(new RepoEntityNotFoundError({ entityId: id, message: `Mock Repo: Entity not found for update with id ${id}` }));
    });

    delete = vi.fn((id: string): DeleteEffect => {
        if (mockChatMessageDb.delete(id)) return Effect.void;
        if (mockSummaryMetaDb.delete(id)) return Effect.void;
        return Effect.fail(new RepoEntityNotFoundError({ entityId: id, message: `Mock Repo: Entity not found for delete with id ${id}` }));
    });
}

// Layer providing the single mock repository instance
export const MockRepositoryLayer = Layer.succeed(
    RepositoryService,
    new MockMultiTypeRepositoryService() as IRepositoryService<any> // Provide generic tag
);


// --- Mock Memory Management Strategy ---
import { type MemoryManagementStrategy } from "../src/memory/chat/chat-memory-service"; // Adjust path

export class MockMemoryManagementStrategy implements MemoryManagementStrategy {
    postAddMessagesHook = vi.fn(
        (_params: {
            conversationId: string;
            addedMessagesCount: number;
            totalMessagesCount: number;
        }): Effect.Effect<void, GenericMemoryError> => {
            // Default behavior: succeed immediately
            return Effect.void;
        }
    );

    // Helper to configure mock behavior for tests
    setHookBehavior(effect: Effect.Effect<void, GenericMemoryError>) {
        this.postAddMessagesHook.mockImplementation(() => effect);
    }
    reset() {
        this.postAddMessagesHook.mockClear();
        this.setHookBehavior(Effect.void); // Reset to default success
    }
}

// Layer providing the mock strategy
export const MockStrategyLayer = Layer.succeed(
    // We need a Tag for the strategy if ChatMemoryServiceLive depends on it via Tag
    // Let's assume a Tag exists:
    MemoryManagementStrategyTag, // You'll need to define this Tag
    new MockMemoryManagementStrategy()
);

// --- Mock Skill Service (if needed by strategy mock, but often not directly) ---
// import { ISkillService, SkillService } from "../skill/skillService"; // Adjust path
// export class MockSkillService implements ISkillService { executeSkill = vi.fn(...) }
// export const MockSkillServiceLayer = Layer.succeed(SkillService, new MockSkillService());


// Updated helper to get mocks
export const getChatTestMocks = Effect.all({
    logSvc: LoggingService,
    repoSvc: RepositoryService, // Will resolve to MockMultiTypeRepositoryService
    strategy: MemoryManagementStrategyTag, // Get the strategy mock instance
    // skillSvc: SkillService // If needed
});

// --- Define Strategy Tag --- (Needs to be defined somewhere accessible)
import { Tag } from "effect";
import { GenericMemoryError } from "../src/memory/chat/chat-memory-service"; // Adjust path

export interface MemoryManagementStrategy {
    readonly postAddMessagesHook: (params: {
        readonly conversationId: string;
        readonly addedMessagesCount: number;
        readonly totalMessagesCount: number;
    }) => Effect.Effect<void, GenericMemoryError>;
}
export const MemoryManagementStrategyTag = Tag<MemoryManagementStrategy>();
