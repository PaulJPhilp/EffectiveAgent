import path from 'path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../configurationService'
import { BaseConfig, ValidationResult } from '../types'

interface TestConfig extends BaseConfig {
    testValue: string
}

class TestConfigurationService extends ConfigurationService<TestConfig> {
    protected validateConfig(_config: TestConfig): ValidationResult {
        return { isValid: true }
    }
}

describe('ConfigurationService', () => {
    let configService: TestConfigurationService

    beforeEach(() => {
        configService = new TestConfigurationService()
    })

    describe('loadConfig', () => {
        it('should load valid configuration files', () => {
            const configPath = path.join(process.cwd(), 'src/shared/config-master/test.json')
            const config = configService.loadConfig(configPath)
            expect(config).toBeDefined()
        })

        it('should throw error with invalid configuration path', () => {
            const invalidPath = path.join(process.cwd(), 'nonexistent/path')
            expect(() => configService.loadConfig(invalidPath)).toThrow()
        })
    })

    describe('getConfig', () => {
        it('should return loaded configuration', () => {
            const configPath = path.join(process.cwd(), 'src/shared/config-master/test.json')
            configService.loadConfig(configPath)
            const config = configService.getConfig()
            expect(config).toBeDefined()
        })

        it('should throw error when config not loaded', () => {
            expect(() => configService.getConfig()).toThrow()
        })
    })
}) 