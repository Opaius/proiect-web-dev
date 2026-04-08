import { browser } from '$app/environment';
import { getWeatherClass, getWeatherType, type WeatherType } from '$lib/utils/weather';

const WEATHER_CLASSES = [
	'weather-sunny',
	'weather-cloudy',
	'weather-rainy',
	'weather-stormy',
	'weather-snowy',
	'weather-misty'
];

function createWeatherThemeStore() {
	let weatherType = $state<WeatherType>('default');

	function applyWeatherClass(className: string) {
		if (!browser) return;
		document.documentElement.classList.remove(...WEATHER_CLASSES);
		if (className) {
			document.documentElement.classList.add(className);
		}
	}

	return {
		get current() {
			return weatherType;
		},
		setFromWeatherId(weatherId: number | undefined) {
			const className = getWeatherClass(weatherId);
			weatherType = getWeatherType(weatherId);
			applyWeatherClass(className);
		},
		clear() {
			weatherType = 'default';
			applyWeatherClass('');
		}
	};
}

export const weatherThemeStore = createWeatherThemeStore();
