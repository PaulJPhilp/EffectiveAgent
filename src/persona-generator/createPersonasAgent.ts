import fs from 'node:fs';
import path from 'node:path';
import { clusteringGraph } from './createPersonaGraph.js';
import { buildModelRegistry, getLLM } from './models.js';

import type { ClusteringState } from './types.js';

// Add a type declaration at the top of the file
interface PersonaResult {
    personaName: string;
    title: string;
}

async function main() {
    console.log('Starting persona generation with LangGraph...')

    buildModelRegistry()

    const initialClusteringState: ClusteringState = {
        runInfo: {
            runId: "",
            startTime: new Date(),
            // Remove the model initialization from here
            outputDir: path.join(process.cwd(), 'data', 'personas', 'runs'),
            model: getLLM("gemini-2.0-flash-exp")
        },
        normalizedProfiles: [],
        basicClusters: { clusters: [], analysisDate: "" },
        error: "",
        errorCount: 0,
        status: "initializing",
        completedSteps: [],
        logs: [],
        recommendations: [],
        currentClusterIndex: 0,
        currentPersona: {
            title: "Initial Persona",
            description: {
                role: "Initial role",
                values: [],
                motivations: [],
                impact: "Initial impact",
                goals: [],
                challenges: [],
                problems: [],
                emotions: {
                    dominant: [],
                    triggers: [],
                    fears: []
                },
                successMetrics: [],
                informationEcosystem: {
                    influencers: [],
                    mediaSources: [],
                    conferences: []
                }
            },
            personaName: "Initial Persona"
        }
    }

    // Add the model AFTER the registry is built
    initialClusteringState.runInfo.model = getLLM("gemini-2.0-flash-exp")

    try {
        const startTime = new Date();

        // Create a new persona agent graph instance with proper initial state
        const executor = await clusteringGraph.invoke(initialClusteringState as unknown as Parameters<typeof clusteringGraph.invoke>[0])
        console.log('Persona generation completed!')
        console.log(`Status: ${executor.status}`)

        if (executor.error !== "") {
            console.error(`Error encountered: ${JSON.stringify(executor.error, null, 3)}`)
            //console.log(executor.logs)
        }

        if (executor.runInfo?.outputDir) {
            console.log(`\nOutput directory: ${executor.runInfo.outputDir}`)

            // List available output files
            if (fs.existsSync(executor.runInfo.outputDir)) {
                //console.log('\nAvailable output files:')
                listOutputFiles(executor.runInfo.outputDir);
            }
        }
    } catch (error) {
        console.error('Error running persona agent graph:', error)
        process.exit(1)
    }
}

/**
 * List important output files in the run directory
 */
function listOutputFiles(dirPath: string) {
    try {
        // List basic clusters
        const basicClustersDir = path.join(dirPath, 'basic-clusters');
        if (fs.existsSync(basicClustersDir)) {
            const files = fs.readdirSync(basicClustersDir);
            if (files.length > 0) {
                console.log(`  • Basic clusters: ${files.length} file(s)`)
                for (const file of files) {
                    console.log(`    - ${path.join(basicClustersDir, file)}`);
                }
            }
        }

        // List elaborated personas
        const elaboratedDir = path.join(dirPath, 'elaborated');
        if (fs.existsSync(elaboratedDir)) {
            const files = fs.readdirSync(elaboratedDir);
            if (files.length > 0) {
                console.log(`  • Elaborated personas: ${files.length} file(s)`)
            }
        }

        // List executive summaries
        const summariesDir = path.join(dirPath, 'executive-summary');
        if (fs.existsSync(summariesDir)) {
            const files = fs.readdirSync(summariesDir);
            if (files.length > 0) {
                console.log(`  • Executive summaries: ${files.length} file(s)`)
            }
        }

        // List full profiles
        const profilesDir = path.join(dirPath, 'full-profile');
        if (fs.existsSync(profilesDir)) {
            const files = fs.readdirSync(profilesDir);
            if (files.length > 0) {
                console.log(`  • Full profiles: ${files.length} file(s)`)
            }
        }

        // Show run summary files
        const summaryFile = path.join(dirPath, 'summary_report.md');
        if (fs.existsSync(summaryFile)) {
            console.log(`  • Run summary: ${summaryFile}`);
        }

        const personasFile = path.join(dirPath, 'personas.json');
        if (fs.existsSync(personasFile)) {
            console.log(`  • Personas index: ${personasFile}`);
        }

        const metadataFile = path.join(dirPath, 'run-metadata.json');
        if (fs.existsSync(metadataFile)) {
            console.log(`  • Run metadata: ${metadataFile}`);
        }

        // Show log files
        const logsDir = path.join(dirPath, 'logs');
        if (fs.existsSync(logsDir)) {
            const logFiles = fs.readdirSync(logsDir);
            if (logFiles.length > 0) {
                console.log(`  • Log files: ${logFiles.length} file(s)`)
                for (const file of logFiles) {
                    if (file === 'run.log') {
                        console.log(`    - ${path.join(logsDir, file)} (main log)`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error listing output files:', error);
    }
}

console.log("STARTING")


// Run the main function
main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
}) 