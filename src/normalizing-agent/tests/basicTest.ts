// A minimal test script to identify what's working
console.log("Starting basic test...");

// First, try a simple import that doesn't rely on complex services
import fs from "node:fs";
import path from "node:path";

// Basic function to check file system access
function checkFileAccess() {
    try {
        const currentDir = process.cwd();
        console.log(`Current directory: ${currentDir}`);
        
        const files = fs.readdirSync(currentDir);
        console.log(`Found ${files.length} files/directories in current dir`);
        
        // Try to read a config file
        const configPath = path.join(currentDir, "src", "shared", "config", "models.json");
        console.log(`Checking for config file at: ${configPath}`);
        
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, "utf8");
            console.log("Config file exists! First 100 chars:");
            console.log(content.substring(0, 100) + "...");
        } else {
            console.log("Config file doesn't exist!");
        }
        
        return true;
    } catch (error) {
        console.error("Error in basic file system check:", error);
        return false;
    }
}

// Now try a minimal import from the codebase
async function tryImport() {
    try {
        console.log("\nTrying to import ModelRegistryService...");
        const { ModelRegistryService } = await import("../../../shared/services/model/modelRegistryService.js");
        console.log("Import successful!");
        
        return true;
    } catch (error) {
        console.error("Import failed:", error);
        return false;
    }
}

// Run the tests
Promise.resolve()
    .then(() => {
        console.log("\n--- File System Check ---");
        return checkFileAccess();
    })
    .then(success => {
        console.log(`File system check: ${success ? "PASSED" : "FAILED"}`);
        
        console.log("\n--- Import Check ---");
        return tryImport();
    })
    .then(success => {
        console.log(`Import check: ${success ? "PASSED" : "FAILED"}`);
        console.log("\nAll checks complete!");
        process.exit(0);
    })
    .catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
