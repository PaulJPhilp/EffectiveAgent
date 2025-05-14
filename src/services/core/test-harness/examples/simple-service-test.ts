/**
 * Example test demonstrating how to use the test harness utilities.
 * 
 * This example shows how to test a simple service that depends on other services
 * using the test harness utilities.
 */

import { Context, Effect, Layer } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  withResource
} from "../utils/context-management.js";
import {
  createServiceError,
  createTypedMock,
  mockFailure,
  mockSuccess
} from "../utils/typed-mocks.js";

// Define a sample database service
interface DatabaseService {
  connect: () => Effect.Effect<void, DatabaseError>;
  disconnect: () => Effect.Effect<void, never>;
  getUser: (id: string) => Effect.Effect<User, UserNotFoundError | DatabaseError>;
  saveUser: (user: User) => Effect.Effect<void, DatabaseError>;
}

// Define a sample logger service
interface LoggerService {
  log: (message: string) => Effect.Effect<void>;
  error: (message: string, error?: Error) => Effect.Effect<void>;
}

// Define a sample user service that depends on database and logger
interface UserService {
  getUserById: (id: string) => Effect.Effect<User, UserNotFoundError |
    DatabaseError>;
  createUser: (user: User) => Effect.Effect<User, DatabaseError>;
}

// Define the user model
interface User {
  id: string;
  name: string;
  email: string;
}

// Define error types
class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

class UserNotFoundError extends Error {
  constructor(public readonly userId: string) {
    super(`User not found with ID: ${userId}`);
    this.name = "UserNotFoundError";
  }
}

// Create Context.Tag for services
const DatabaseServiceTag = Context.GenericTag<DatabaseService>("DatabaseService");
const LoggerServiceTag = Context.GenericTag<LoggerService>("LoggerService");
const UserServiceTag = Context.GenericTag<UserService>("UserService");

// Implementation of UserService
class UserServiceImpl implements UserService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService
  ) { }

  getUserById(id: string): Effect.Effect<User, UserNotFoundError | DatabaseError> {
    const logic = Effect.gen(function* () {
      yield* Effect.logDebug(`Getting user with ID: ${id}`);
      const db = yield* DatabaseServiceTag;
      const logger = yield* LoggerServiceTag;

      const user = yield* db.getUser(id);
      yield* logger.log(`Found user: ${user.name}`);
      return user;
    });

    return Effect.tryCatchEffect(
      logic,
      (caughtError) => Effect.gen(function* () {
        const logger = yield* LoggerServiceTag;
        yield* logger.error(
          `Error getting user: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
          caughtError instanceof Error ? caughtError : new Error(String(caughtError))
        );
        if (caughtError instanceof UserNotFoundError || caughtError instanceof DatabaseError) {
          return yield* Effect.fail(caughtError);
        }
        // For unexpected errors, wrap in DatabaseError as a default
        return yield* Effect.fail(new DatabaseError(`Unexpected error in getUserById: ${String(caughtError)}`));
      })
    ).pipe(
      Effect.provideService(DatabaseServiceTag, this.db),
      Effect.provideService(LoggerServiceTag, this.logger)
    );
  }

  createUser(user: User): Effect.Effect<User, DatabaseError> {
    const logic = Effect.gen(function* () {
      yield* Effect.logDebug(`Creating user: ${user.name}`);
      const db = yield* DatabaseServiceTag;
      const logger = yield* LoggerServiceTag;

      yield* db.saveUser(user);
      yield* logger.log(`Created user: ${user.name}`);
      return user;
    });

    return Effect.tryCatchEffect(
      logic,
      (caughtError) => Effect.gen(function* () {
        const logger = yield* LoggerServiceTag;
        yield* logger.error(
          `Error creating user: ${caughtError instanceof Error ? caughtError.message : String(caughtError)}`,
          caughtError instanceof Error ? caughtError : new Error(String(caughtError))
        );
        if (caughtError instanceof DatabaseError) {
          return yield* Effect.fail(caughtError);
        }
        // For unexpected errors, wrap in DatabaseError
        return yield* Effect.fail(new DatabaseError(`Unexpected error in createUser: ${String(caughtError)}`));
      })
    ).pipe(
      Effect.provideService(DatabaseServiceTag, this.db),
      Effect.provideService(LoggerServiceTag, this.logger)
    );
  }

  static make = Effect.gen(function* () {
    const db = yield* DatabaseServiceTag;
    const logger = yield* LoggerServiceTag;
    return new UserServiceImpl(db, logger);
  });
}

// Create a Layer for UserService
const UserServiceLayer = Layer.effect(
  UserServiceTag,
  UserServiceImpl.make
);

describe("UserService", () => {
  // Setup test data
  const testUser: User = {
    id: "user-123",
    name: "Test User",
    email: "test@example.com"
  };

  // Create mock services
  const mockLogger = createTypedMock<LoggerService>({
    log: (message) => Effect.sync(() => { /* mock implementation */ }),
    error: (message, error) => Effect.sync(() => { /* mock implementation */ })
  });

  const mockDb = createTypedMock<DatabaseService>({
    connect: () => Effect.succeed(void 0),
    disconnect: () => Effect.succeed(void 0),
    getUser: (id) => mockSuccess(testUser),
    saveUser: (user) => Effect.succeed(void 0)
  });

  // Create spy functions
  const logSpy = vi.fn();
  const errorSpy = vi.fn();
  const getUserSpy = vi.fn();
  const saveUserSpy = vi.fn();

  // Setup enhanced mocks with spies
  const spiedLogger = createTypedMock<LoggerService>(mockLogger, {
    log: (message) => Effect.sync(() => logSpy(message)),
    error: (message, error) => Effect.sync(() => errorSpy(message, error))
  });

  const spiedDb = createTypedMock<DatabaseService>(mockDb, {
    getUser: (id) => {
      getUserSpy(id);
      return mockSuccess(testUser);
    },
    saveUser: (user) => {
      saveUserSpy(user);
      return Effect.succeed(void 0);
    }
  });

  // Create a resource for database connection
  const withDatabase = (db: DatabaseService) =>
    withResource(
      db.connect(),
      () => db.disconnect()
    );

  // Reset spies before each test
  beforeEach(() => {
    logSpy.mockReset();
    errorSpy.mockReset();
    getUserSpy.mockReset();
    saveUserSpy.mockReset();
  });

  describe("getUserById", () => {
    it("should return a user when found", async () => {
      // Create a UserService instance with mock dependencies
      const userService = new UserServiceImpl(spiedDb, spiedLogger);

      // Use withResource to manage database connection
      const program = withDatabase(spiedDb)(() =>
        userService.getUserById("user-123")
      );

      // Run the program
      const result = await Effect.runPromise(program);

      // Verify the result
      expect(result).toEqual(testUser);
      expect(getUserSpy).toHaveBeenCalledWith("user-123");
      expect(logSpy).toHaveBeenCalledWith("Found user: Test User");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("should handle user not found error", async () => {
      // Create a mock database that returns an error
      const errorDb = createTypedMock<DatabaseService>(spiedDb, {
        getUser: (id) => {
          getUserSpy(id);
          return mockFailure(createServiceError(UserNotFoundError, id));
        }
      });

      // Create a UserService instance with mock dependencies
      const userService = new UserServiceImpl(errorDb, spiedLogger);

      // Use withResource to manage database connection
      const program = withDatabase(errorDb)(() =>
        userService.getUserById("user-123")
      );

      // Run the program and assert the error
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left;
        expect(error).toBeInstanceOf(UserNotFoundError);
        if (error instanceof UserNotFoundError) { // Type guard for specific properties
          expect(error.userId).toBe("user-123");
        }
      }
      expect(getUserSpy).toHaveBeenCalledWith("user-123");
      expect(errorSpy).toHaveBeenCalled(); // errorSpy is called by the refactored UserServiceImpl
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("should handle database error on get user", async () => {
      // Create a mock database that returns an error
      const errorDb = createTypedMock<DatabaseService>(spiedDb, {
        getUser: (id) => {
          getUserSpy(id);
          return mockFailure(createServiceError(DatabaseError, "Connection lost"));
        }
      });

      const userService = new UserServiceImpl(errorDb, spiedLogger);
      const program = withDatabase(errorDb)(() => userService.getUserById("user-123"));
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(DatabaseError);
      }
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("createUser", () => {
    it("should create a user successfully", async () => {
      // Create a UserService instance with mock dependencies
      const userService = new UserServiceImpl(spiedDb, spiedLogger);

      // Use withResource to manage database connection
      const program = withDatabase(spiedDb)(() =>
        userService.createUser(testUser)
      );

      // Run the program
      const result = await Effect.runPromise(program);

      // Verify the result
      expect(result).toEqual(testUser);
      expect(saveUserSpy).toHaveBeenCalledWith(testUser);
      expect(logSpy).toHaveBeenCalledWith("Created user: Test User");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("should handle database error on create user", async () => {
      const errorDb = createTypedMock<DatabaseService>(spiedDb, {
        saveUser: (user) => {
          saveUserSpy(user);
          return mockFailure(createServiceError(DatabaseError, "Disk full"));
        }
      });

      const userService = new UserServiceImpl(errorDb, spiedLogger);
      const program = withDatabase(errorDb)(() => userService.createUser(testUser));
      const result = await Effect.runPromise(Effect.either(program));

      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(DatabaseError);
      }
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
