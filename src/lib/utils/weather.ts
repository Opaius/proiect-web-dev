/**
 * OpenWeather condition codes mapping to weather types
 * https://openweathermap.org/weather-conditions
 */

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'misty' | 'default';

export const weatherClasses: Record<WeatherType, string> = {
	sunny: 'weather-sunny',
	cloudy: 'weather-cloudy',
	rainy: 'weather-rainy',
	stormy: 'weather-stormy',
	snowy: 'weather-snowy',
	misty: 'weather-misty',
	default: ''
};

export const weatherDescriptions: Record<WeatherType, string> = {
	sunny: 'Clear skies',
	cloudy: 'Overcast',
	rainy: 'Rainy',
	stormy: 'Thunderstorm',
	snowy: 'Snowy',
	misty: 'Misty',
	default: 'Weather'
};

/**
 * Map OpenWeather weather condition ID to weather type
 */
export function getWeatherType(weatherId: number | undefined): WeatherType {
	if (weatherId == null) return 'default';

	// 2xx: Thunderstorm
	if (weatherId >= 200 && weatherId < 300) return 'stormy';

	// 3xx: Drizzle
	if (weatherId >= 300 && weatherId < 400) return 'rainy';

	// 5xx: Rain
	if (weatherId >= 500 && weatherId < 600) return 'rainy';

	// 6xx: Snow
	if (weatherId >= 600 && weatherId < 700) return 'snowy';

	// 7xx: Atmosphere (mist, fog, etc.)
	if (weatherId >= 700 && weatherId < 800) return 'misty';

	// 800: Clear sky
	if (weatherId === 800) return 'sunny';

	// 80x: Clouds
	if (weatherId > 800 && weatherId < 900) return 'cloudy';

	return 'default';
}

/**
 * Get CSS class for weather type
 */
export function getWeatherClass(weatherId: number | undefined): string {
	return weatherClasses[getWeatherType(weatherId)];
}
