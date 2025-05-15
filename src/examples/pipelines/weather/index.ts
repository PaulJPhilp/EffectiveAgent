/**
 * @file Index file for Weather Service
 * @module ea/pipelines/weather
 */

export {
    makeMockWeatherServiceImpl, MockWeatherConfigService, WeatherConfigService,
    // Service Classes (Tags and default Live Layers)
    WeatherService,
    // Mock/Test Utilities
    WeatherServiceTestLayer, type WeatherCondition, type WeatherData, type WeatherPipelineConfig,
    type WeatherPipelineInput,
    // API Interfaces and Types
    type WeatherServiceApi
} from "./service.js";

export * from "./errors.js"; // Exports WeatherPipelineError

