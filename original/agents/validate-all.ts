#!/usr/bin/env bun

import { validateNormalizingAgent } from './normalizing-new/run-validate.js'
import { validatePersonaEvaluatorAgent } from './persona-evaluator-new/run-validate.js'
import { validatePersonaGeneratorAgent } from './persona-generator-new/run-validate.js'
import { validatePersonaImageAgent } from './persona-image-new/run-validate.js'

interface ValidationResult {
    readonly agentName: string
    readonly success: boolean
    readonly error?: string
    readonly duration?: number
}

/**
 * Validates all agent configurations
 */
async function validateAllAgents(): Promise<void> {
    // Force development mode for validation
    process.env.NODE_ENV = 'development'

    console.log('\n🔍 Starting agent validation...\n')

    const validations: ValidationResult[] = []
    const agents = [
        { name: 'Normalizing Agent', validate: validateNormalizingAgent },
        { name: 'Persona Generator Agent', validate: validatePersonaGeneratorAgent },
        { name: 'Persona Image Agent', validate: validatePersonaImageAgent },
        { name: 'Persona Evaluator Agent', validate: validatePersonaEvaluatorAgent }
    ]

    // Run all validations
    for (const agent of agents) {
        const startTime = performance.now()
        try {
            console.log(`⏳ Validating ${agent.name}...`)
            await agent.validate()
            const duration = Math.round(performance.now() - startTime)
            console.log(`✅ ${agent.name}: Valid (${duration}ms)\n`)
            validations.push({
                agentName: agent.name,
                success: true,
                duration
            })
        } catch (error) {
            const duration = Math.round(performance.now() - startTime)
            console.error(`❌ ${agent.name}: Invalid (${duration}ms)`)
            if (error instanceof Error) {
                console.error(`   Error: ${error.message}`)
                if (error.stack) {
                    console.error(`   Stack: ${error.stack.split('\n').slice(1).join('\n          ')}`)
                }
            } else {
                console.error(`   Error: ${String(error)}`)
            }
            console.error('')
            validations.push({
                agentName: agent.name,
                success: false,
                error: error instanceof Error ? error.message : String(error),
                duration
            })
        }
    }

    // Print summary
    const failedValidations = validations.filter(v => !v.success)
    const totalDuration = validations.reduce((sum, v) => sum + (v.duration || 0), 0)

    console.log('📊 Validation Summary:')
    console.log('====================')
    console.log(`Total Duration: ${totalDuration}ms`)
    console.log(`Total Agents: ${validations.length}`)
    console.log(`Passed: ${validations.length - failedValidations.length}`)
    console.log(`Failed: ${failedValidations.length}\n`)

    if (failedValidations.length > 0) {
        console.error('❌ Failed Validations:')
        for (const validation of failedValidations) {
            console.error(`   - ${validation.agentName}: ${validation.error}`)
        }
        process.exit(1)
    }

    console.log('✅ All agents validated successfully')
    process.exit(0)
}

// Run validation if this is the main module
if (import.meta.url.endsWith('validate-all.ts')) {
    validateAllAgents().catch(error => {
        console.error('\n💥 Unexpected error during validation:')
        console.error(error instanceof Error ? error.stack : String(error))
        process.exit(1)
    })
} 