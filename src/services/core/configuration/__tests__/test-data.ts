// File: src/services/core/configuration/__tests__/test-data.ts

import { z } from "zod";
// REMOVED: import { BaseConfigSchema } from "../schema.js";

// --- Test Constants ---
export const testBasePath = "/app/config-test-real"; // Base path for tests (will be replaced by dynamic tempDir path in test setup)

// --- Schemas ---
// Define the full schema needed for testing directly here
export const validSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  // Add any other base fields you expect your configs to generally have, if any.
  // If there's no common base structure required by ConfigLoader itself,
  // then just define the fields needed for this specific test data.
});
export type ValidConfig = z.infer<typeof validSchema>;

// --- Test Data Objects ---
export const validConfigData: ValidConfig = {
  name: "TestApp",
  version: "1.0"
};

// --- File Contents ---
export const validConfigFileContent = JSON.stringify(validConfigData);
export const invalidJsonContent = "{ name: 'bad json', ";
export const validationErrorContent = JSON.stringify({ name: 123 }); // name should be string

// --- Filenames ---
export const validConfigFilename = "valid.json";
export const invalidJsonFilename = "invalid.json";
export const validationErrorFilename = "invalid-schema.json";
export const nonExistentFilename = "not-found.json";
export const nestedFilename = "subdir/nested.json";

// --- Full Paths (Primarily for setup/assertions, basePath is dynamic in tests) ---
export const validConfigFullPath = `${testBasePath}/${validConfigFilename}`;
export const invalidJsonFullPath = `${testBasePath}/${invalidJsonFilename}`;
export const validationErrorFullPath = `${testBasePath}/${validationErrorFilename}`;
// export const nonExistentFullPath = `${testBasePath}/${nonExistentFilename}`; // Path used in error check
export const nestedFullPath = `${testBasePath}/${nestedFilename}`;

