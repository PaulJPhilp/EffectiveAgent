
import { normalizeProfilesNode } from "../nodes/normalizeProfilesNode.js";
import type { NormalizationState, ProfileData } from "../types.js";
import { ModelRegistryService } from "../../../shared/services/model/modelRegistryService.js";
import { TaskRegistryService } from "../../../shared/services/task/taskRegistryService.js";
// Add directly required services to debug
import { ModelService } from "../../../shared/services/model/modelService.js";

// Set up global error handler to catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

async function testModelServiceIntegration() {
	console.log("Testing Model Service Integration...");
	
	// Initialize services needed for the test
	try {
		// Initialize the model registry
		const modelRegistry = new ModelRegistryService();
		console.log(`Model registry initialized with ${modelRegistry.getAllModels().length} models`);
		
		// Initialize the task registry
		const taskRegistry = new TaskRegistryService();
		console.log("Task registry service initialized properly");
		console.log("Task registry initialized");
	} catch (error) {
		console.error("Failed to initialize services:", error);
		throw error;
	}

	// Create a sample profile
	const sampleProfile: ProfileData = {
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
	const testState: NormalizationState = {
		profiles: [sampleProfile],
		status: "loading_profiles",
		runInfo: {
			runId: "test-run",
			startTime: new Date().toISOString(),
			outputDir: "/Users/paul/projects/pdf-loader/data/test-output"
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

	try {
		console.log("Starting normalization process...");
		// Run the normalization node
		const result = await normalizeProfilesNode(testState, {});

		// Check the results
		console.log("Normalization completed with status:", result.status);
		console.log("Normalized profiles:",
			result.normalizedProfiles?.length ?? 0);

		if (result.normalizedProfiles && result.normalizedProfiles.length > 0) {
			console.log("First normalized profile:",
				JSON.stringify(result.normalizedProfiles[0], null, 2));
		}

		if (result.error) {
			console.error("Error in result:", result.error);
		}

		return result.status === "profiles_normalized";
	} catch (error) {
		console.error("Test failed with error:", error instanceof Error ? error.message : String(error));
		console.error("Error stack:", error instanceof Error ? error.stack : "No stack available");
		return false;
	}
}

// Simple wrapper function to initialize key services directly
async function initializeServicesDirectly() {
	console.log("Initializing services directly...");
	try {
		// Initialize the model registry
		const modelRegistry = new ModelRegistryService();
		console.log(`Model registry initialized with ${modelRegistry.getAllModels().length} models`);
		
		// Print all available models for debugging
		const allModels = modelRegistry.getAllModels();
		allModels.forEach(model => {
			console.log(`Available model: ${model.id} (${model.provider})`);
		});
		
		// Initialize the task registry
		const taskRegistry = new TaskRegistryService();
		console.log("Task registry service initialized properly");
		console.log("Task registry initialized");
		
		// Initialize the model service 
		const modelService = new ModelService();
		console.log("Model service initialized");
		
		return true;
	} catch (error) {
		console.error("Failed to initialize services directly:", 
			error instanceof Error ? error.message : String(error));
		console.error("Error stack:", 
			error instanceof Error ? error.stack : "No stack available");
		return false;
	}
}

// Run the initialization first, then the test
initializeServicesDirectly()
	.then(initialized => {
		if (!initialized) {
			console.error("Failed to initialize services, skipping test");
			process.exit(1);
		}
		return testModelServiceIntegration();
	})
	.then(success => {
		console.log(`Test ${success ? "PASSED" : "FAILED"}`);
		process.exit(success ? 0 : 1);
	})
	.catch(error => {
		console.error("Test execution error:", 
			error instanceof Error ? error.message : String(error));
		console.error("Error stack:", 
			error instanceof Error ? error.stack : "No stack available");
		process.exit(1);
	});