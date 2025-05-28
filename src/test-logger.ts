import { Effect, Runtime, Scope, Exit } from 'effect';
import { AgentRuntime } from './agent-runtime.js';
import { MasterConfigData } from './core/config/master-config-schema.js';

const testLogger = async () => {
  const scope = await Effect.runPromise(Scope.make());
  
  // Create test config
  const testConfig: MasterConfigData = {
    version: "1.0.0",
    runtimeSettings: {
      fileSystemImplementation: "node" as const
    },
    logging: {
      level: "warn",
      filePath: "/tmp/test-logger.log"
    },
    configPaths: {
      providers: "./config/providers.json",
      models: "./config/models.json",
      policy: "./config/policy.json"
    }
  };

  try {
    // Initialize AgentRuntime
    const runtime = await Effect.runPromise(AgentRuntime.initialize(testConfig));
    console.log('AgentRuntime initialized successfully');

    // Test different log levels
    const program = Effect.gen(function* (_) {
      yield* Effect.logDebug('This is a debug message');
      yield* Effect.logInfo('This is an info message');
      yield* Effect.logWarning('This is a warning message');
      yield* Effect.logError('This is an error message');
      
      // Test structured logging
      yield* Effect.logInfo('Testing structured data', {
        timestamp: new Date().toISOString(),
        data: { foo: 'bar', count: 42 }
      });

      // Add a small delay to ensure logs are written
      yield* Effect.sleep('100 millis');
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provideService(Scope.Scope, scope)
      )
    );

    console.log('Test completed. Check the log file for output.');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await Effect.runPromise(Scope.close(scope, Exit.succeed(void 0)));
  }
};

// Run the test
testLogger();
