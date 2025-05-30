/**
 * @file Helper functions for the weather service
 * @module ea/pipelines/weather/helpers
 */

/**
 * Converts temperature between Celsius and Fahrenheit
 */
export function convertTemperature(
    temp: number,
    toUnit: "celsius" | "fahrenheit"
): number {
    if (toUnit === "celsius") {
        return Math.round((temp - 32) * 5 / 9);
    }
    return Math.round((temp * 9 / 5) + 32);
}
