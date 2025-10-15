import { join } from "node:path";
import { config } from "dotenv";

// Load environment variables from .env.test
const result = config({ path: join(process.cwd(), ".env.test") });

if (result.error) {
  console.error("Error loading .env.test file:", result.error);
  // In a test environment, we might want to throw the error
  // to fail fast if the configuration is missing.
  throw result.error;
}

console.log("Loaded environment variables from .env.test");
