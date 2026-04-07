import type { Units } from './hooks/localStorage.svelte';

export function convertTemp(celsius: number, unit: Units): number {
	switch (unit) {
		case 'fahrenheit':
			return +((celsius * 9) / 5 + 32).toFixed(1);
		case 'kelvin':
			return +(celsius + 273.15).toFixed(2);
		default:
			return +celsius.toFixed(1);
	}
}

export function unitSymbol(unit: Units): string {
	const symbols: Record<Units, string> = {
		celsius: '°C',
		fahrenheit: '°F',
		kelvin: 'K'
	};
	return symbols[unit];
}

export function formatTemp(celsius: number, unit: Units): string {
	return `${convertTemp(celsius, unit)}${unitSymbol(unit)}`;
}
