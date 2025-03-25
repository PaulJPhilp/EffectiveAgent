import { identifyPersonaClusters } from './personaClusters.js'

async function main() {
    try {
        console.log('Starting persona cluster analysis...')
        const result = await identifyPersonaClusters()

        console.log('\nClustering Analysis Results:')
        console.log('===========================')
        console.log(`Total Profiles Analyzed: ${result.totalProfiles}`)
        console.log(`Number of Clusters: ${result.clusters.length}`)
        console.log('\nIdentified Personas:')

        for (const cluster of result.clusters) {
            console.log(`\n${cluster.name} (${cluster.percentageOfTotal}% of profiles)`)
            console.log('-'.repeat(40))
            console.log(cluster.description)
            console.log('\nKey Characteristics:')
            for (const char of cluster.commonCharacteristics) {
                console.log(`- ${char}`)
            }
            console.log('\nCommon Skills:')
            for (const skill of cluster.skills) {
                console.log(`- ${skill}`)
            }
        }

        console.log('\nOverall Analysis:')
        console.log(result.analysis)
    } catch (error) {
        console.error('Error running cluster analysis:', error)
        process.exit(1)
    }
}

main() 