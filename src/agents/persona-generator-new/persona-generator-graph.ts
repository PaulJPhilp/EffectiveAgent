import { ModelService } from '../../shared/services/model/modelService.js'
import { PromptService } from '../../shared/services/prompt/promptService.js'
import { ProviderService } from '../../shared/services/provider/providerService.js'
import { TaskService } from '../../shared/services/task/TaskService.js'
import { AgentGraph } from '../agent-service/AgentGraph.js'
import { ClusterPersonasNode } from './nodes/cluster-personas.js'
import { ElaboratePersonasNode } from './nodes/elaborate-personas.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { LoadProfilesNode } from './nodes/load-profiles.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { PersonaGeneratorState } from './types.js'

/**
 * Creates a persona generator graph with the specified services
 */
export function createPersonaGeneratorGraph(
    taskService: TaskService,
    providerService: ProviderService,
    modelService: ModelService,
    promptService: PromptService
): AgentGraph<PersonaGeneratorState> {
    // Create nodes
    const initializeRun = new InitializeRunNode(taskService, providerService, modelService, promptService)
    const loadProfiles = new LoadProfilesNode(taskService, providerService, modelService, promptService)
    const clusterPersonas = new ClusterPersonasNode(taskService, providerService, modelService, promptService)
    const elaboratePersonas = new ElaboratePersonasNode(taskService, providerService, modelService, promptService)
    const saveResults = new SaveResultsNode(taskService, providerService, modelService, promptService)

    // Define graph structure
    const graph = {
        'initialize_run': {
            node: initializeRun,
            next: ['load_profiles']
        },
        'load_profiles': {
            node: loadProfiles,
            next: ['cluster_personas']
        },
        'cluster_personas': {
            node: clusterPersonas,
            next: ['elaborate_personas']
        },
        'elaborate_personas': {
            node: elaboratePersonas,
            next: ['save_results']
        },
        'save_results': {
            node: saveResults,
            next: []
        }
    }

    return new AgentGraph(
        graph,
        'initialize_run',
        taskService,
        providerService,
        modelService,
        promptService
    )
} 