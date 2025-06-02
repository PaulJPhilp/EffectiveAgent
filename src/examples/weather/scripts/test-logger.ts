#!/usr/bin/env -S node --no-warnings

import { createLogger, logToFile } from "../utils/logToFile.js";

// Test basic logging
console.log("Testing basic logging...");
logToFile("This is a test log message");

// Test logging with data
console.log("Testing logging with data...");
logToFile("Test with data", { 
  timestamp: new Date().toISOString(),
  status: "success",
  data: { key: "value", number: 42 }
});

// Test with custom options
console.log("Testing with custom options...");
logToFile("Custom log file location", 
  { test: "custom location" },
  { 
    logDir: "./logs/custom",
    logFileBase: "custom-log",
    includeTimestamp: true
  }
);

// Test with a pre-configured logger
console.log("Testing pre-configured logger...");
const appLogger = createLogger({
  logDir: "./logs/app",
  logFileBase: "application"
});

appLogger("App started", { version: "1.0.0" });
appLogger("User action", { userId: 123, action: "login" });

console.log("All tests completed. Check the log files in the logs/ directory.");
