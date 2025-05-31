# Weather Agent Example

This example demonstrates how to use the EffectiveAgent framework to create a weather information agent.

## Setup

### 1. Environment Variables

Set up the following environment variables (you can create a `.env` file in the project root):

```bash
# Master configuration file path
MASTER_CONFIG_PATH=./config/master-config.json

# API Keys for providers
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional: Weather API key if using real weather data
WEATHER_API_KEY=your_weather_api_key_here
```

### 2. Configuration Files

The weather agent uses the configuration files in the `config/` directory:

- `master-config.json` - Main configuration pointing to other config files
- `providers.json` - AI provider configurations (OpenAI, Anthropic)
- `models.json` - AI model definitions
- `policy.json` - Access and rate limiting policies

## Running the Tests

### E2E Tests
```bash
bun test src/examples/weather/__tests__/weather-agent-e2e.test.ts
```

### Manual Testing Script
```bash
bun run src/examples/weather/scripts/test-weather-service.ts
```

## Features

The weather agent provides:

- **Weather Data Retrieval**: Get current weather for any location
- **Weather Summaries**: Natural language summaries of weather conditions
- **Agent State Management**: Tracks request history and state
- **Concurrent Requests**: Handle multiple weather requests simultaneously
- **Configurable Units**: Support for different temperature and wind speed units

## Configuration

The agent uses the following default configuration:

- **Default Model**: `gpt-4o`
- **Temperature Units**: Celsius
- **Wind Speed Units**: Meters per second
- **Max Tokens**: 100
- **Temperature**: 0.7

## Logging

Logging is configured through the master configuration file. The agent logs:

- Service initialization
- Weather data requests
- Text generation activities
- Error conditions

Log files are written to `./logs/app.log` by default. 