import { Effect } from "effect";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { afterAll, beforeAll, describe, it } from "vitest";

// Import the logToFile function directly
import { WeatherService } from "../service.js";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test log file path
const LOG_DIR = join(__dirname, "../../logs");
const LOG_FILE = join(LOG_DIR, "weather-test.log");

// Helper to read log file contents
const readLogFile = (): string => {
  try {
    return readFileSync(LOG_FILE, 'utf8');
  } catch (error) {
    return '';
  }
};

// Clean up before tests (but preserve logs after tests)
const cleanUpBefore = () => {
  try {
    // Only clean up the log file if it exists
    if (existsSync(LOG_FILE)) {
      console.log(`[TEST] Removing existing log file: ${LOG_FILE}`);
      unlinkSync(LOG_FILE);
    }

    // Create log directory if it doesn't exist
    if (!existsSync(LOG_DIR)) {
      console.log(`[TEST] Creating log directory: ${LOG_DIR}`);
      mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Just log the location of the log file after tests
const logTestCompletion = () => {
  if (existsSync(LOG_FILE)) {
    console.log(`\n[TEST] Log file created at: ${LOG_FILE}`);
    const separator = '='.repeat(80);
    console.log(separator);
    console.log('LOG FILE CONTENTS:');
    console.log(separator);
    console.log(readLogFile());
    console.log(separator);
  } else {
    console.log(`\n[TEST] No log file was created at: ${LOG_FILE}`);
  }
};
// Set up test environment
beforeAll(() => {
  console.log(`[TEST] Setting up test environment`);
  console.log(`[TEST] Log file will be created at: ${LOG_FILE}`);

  // Clean up any existing logs before tests
  cleanUpBefore();

  // Set environment variables for logging
  process.env.LOG_DIR = LOG_DIR;
  process.env.LOG_FILE_BASE = "weather-test";

  console.log(`[TEST] Environment variables set`);
  console.log(`[TEST] LOG_DIR: ${process.env.LOG_DIR}`);
  console.log(`[TEST] LOG_FILE_BASE: ${process.env.LOG_FILE_BASE}`);
});

// After all tests, show where the log file is
// but don't delete it so we can inspect it
afterAll(() => {
  logTestCompletion();
});

describe("WeatherService Logging", () => {
  it("should write to log file when getting weather", () =>
    Effect.gen(function* () {
      console.log("[TEST] Starting test for file writing...");

      // Verify log file doesn't exist at the start of the test
      if (existsSync(LOG_FILE)) {
        return Effect.fail(new Error(`Log file already exists at ${LOG_FILE} before test started`));
      }

      const service = yield* WeatherService;

      // This should trigger logToFile
      console.log("[TEST] Calling getWeather...");
      const result = yield* service.getWeather({
        location: "TestCity",
        includeForecast: false
      });

      // Give the file system a moment to write
      console.log("[TEST] Waiting for file write to complete...");
      yield* Effect.promise(() => new Promise(resolve => setTimeout(resolve, 200)));

      // Verify the log file was created
      if (!existsSync(LOG_FILE)) {
        return Effect.fail(new Error(`Log file not found at ${LOG_FILE}`));
      }

      // Read the log file
      const logContent = readLogFile();
      console.log("[TEST] Log file content:", JSON.stringify(logContent));

      // Verify the log file contains the expected content
      const expectedLogs = [
        "Getting weather data",
        "TestCity",
        "Generated weather data"
      ];

      const missingLogs = expectedLogs.filter(log => !logContent.includes(log));
      if (missingLogs.length > 0) {
        return Effect.fail(new Error(
          `Log file is missing expected content: ${missingLogs.join(", ")}\n` +
          `Actual content: ${logContent}`
        ));
      }

      return Effect.succeed(true);
    }).pipe(
      Effect.catchAll((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[TEST] Test failed:", errorMessage);
        return Effect.fail(new Error(`Test failed: ${errorMessage}`));
      })
    )
  );
});
