// Simple script to debug imports
console.log("Starting import debugging...");

try {
    console.log("Importing model registry service...");
    import("./shared/services/model/modelRegistryService.js")
        .then(module => {
            console.log("Successfully imported modelRegistryService");
            return module.ModelRegistryService.getInstance();
        })
        .then(instance => {
            console.log("Successfully got ModelRegistryService instance");
            return instance.getAllModels();
        })
        .then(models => {
            console.log(`Found ${models.length} models in registry`);
            models.forEach(model => {
                console.log(`- ${model.id} (${model.provider})`);
            });
        })
        .catch(error => {
            console.error("Error in model registry:", error);
        });

    console.log("Importing task registry service...");
    import("./shared/services/task/taskRegistryService.js")
        .then(module => {
            console.log("Successfully imported taskRegistryService");
            return module.TaskRegistryService.getInstance();
        })
        .then(instance => {
            console.log("Successfully got TaskRegistryService instance");
            return instance.getAllTaskConfigs();
        })
        .then(tasks => {
            console.log(`Found ${Object.keys(tasks).length} tasks in registry`);
            Object.keys(tasks).forEach(taskName => {
                console.log(`- ${taskName}: ${tasks[taskName].primaryModelId || 'no primary model'}`);
            });
        })
        .catch(error => {
            console.error("Error in task registry:", error);
        });

    console.log("Importing model service...");
    import("./shared/services/model/modelService.js")
        .then(module => {
            console.log("Successfully imported modelService");
            return module.ModelService.getInstance();
        })
        .then(instance => {
            console.log("Successfully got ModelService instance");
        })
        .catch(error => {
            console.error("Error in model service:", error);
        });

} catch (error) {
    console.error("Critical error during imports:", error);
}

console.log("Import debugging complete");
