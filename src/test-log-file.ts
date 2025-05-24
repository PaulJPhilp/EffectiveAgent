/**
 * Creates a directory called 'test.log' and writes 'Hello World' to 'app.log' inside it.
 * Node.js/TypeScript script for manual testing (not using Effect or project services).
 */
import { promises as fs } from "fs";
import { join } from "path";

const TEST_LOG_DIR: string = "test.log";
const APP_LOG_FILE: string = "app.log";
const LOG_MESSAGE: string = "Hello World";

async function main(): Promise<void> {
  const dirPath: string = join(process.cwd(), TEST_LOG_DIR);
  const filePath: string = join(dirPath, APP_LOG_FILE);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, LOG_MESSAGE, { encoding: "utf8" });
  // eslint-disable-next-line no-console
  console.log(`Wrote to ${filePath}: ${LOG_MESSAGE}`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Failed to write log file:", err);
  process.exit(1);
});
