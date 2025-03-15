// Simple script to run the normalizing agent
import { normalizeProfilesNode } from "./src/normalizing-agent/nodes/normalizeProfilesNode.js";

// Create a sample profile
const sampleProfile = {
    name: "John Doe",
    title: "Senior Software Engineer",
    location: "San Francisco, CA",
    key_skills: ["JavaScript", "TypeScript", "Node.js", "React"],
    contact: {
        email: "john.doe@example.com",
        linkedin: "https://linkedin.com/in/johndoe",
        company_website: null
    },
    certificates: [],
    experience: [{
        company: "Tech Corp",
        title: "Senior Developer",
        duration: "2018-2023",
        description: ["Led development team", "Implemented CI/CD pipelines"]
    }],
    sourceFile: "sample_resume.pdf",
    fileText: "John Doe - Senior Software Engineer with experience in JavaScript",
    fileType: "pdf"
};

// Create a test state
const testState = {
    profiles: [sampleProfile],
    status: "loading_profiles",
    runInfo: {
        runId: "test-run",
        startTime: new Date().toISOString(),
        outputDir: "./data/test-output"
    },
    normalizedProfiles: [],
    normalizationResults: [],
    summary: {
        totalProfiles: 0,
        successfulNormalizations: 0,
        failedNormalizations: 0,
        errors: []
    },
    completedSteps: [],
    error: "",
    logs: []
};

// Run the normalizing agent
async function runNormalizingAgent() {
    console.log("Running normalizing agent...");
    
    try {
        const result = await normalizeProfilesNode(testState, {});
        console.log("Normalization completed with status:", result.status);
        
        if (result.normalizedProfiles && result.normalizedProfiles.length > 0) {
            console.log("Successfully normalized profile:");
            console.log(JSON.stringify(result.normalizedProfiles[0], null, 2));
        } else {
            console.log("No normalized profiles were returned");
        }
        
        if (result.error) {
            console.error("Error in result:", result.error);
        }
        
        return true;
    } catch (error) {
        console.error("Failed to run normalizing agent:", 
            error instanceof Error ? error.message : String(error));
        console.error("Error stack:", 
            error instanceof Error ? error.stack : "No stack available");
        return false;
    }
}

// Run the test
runNormalizingAgent()
    .then(success => {
        console.log(`Normalizing agent ${success ? "SUCCEEDED" : "FAILED"}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("Unhandled error:", error);
        process.exit(1);
    });
