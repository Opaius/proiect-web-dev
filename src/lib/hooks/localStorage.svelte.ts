import { browser } from '$app/environment';
import type { FormattedData } from '$lib/server/api';
import type { Cookies } from '@sveltejs/kit';

type AnyStore = { current: any };

const registry = new Map<string, AnyStore>();

function register<T extends AnyStore>(key: string, store: T): T {
	registry.set(key, store);
	return store;
}

export function loadPreferences(cookies: Cookies) {
	return Object.fromEntries(
		[...registry.entries()].map(([key]) => [
			key,
			cookies.get(key) ? decodeURIComponent(cookies.get(key)!) : null
		])
	);
}

export function applyPreferences(data: Record<string, string | null>) {
	for (const [key, store] of registry) {
		if (data[key] != null) store.current = data[key];
	}
}

const TEN_YEARS = 3650;

function readCookie(key: string): string | null {
	if (!browser) return null;
	const found = document.cookie
		.split('; ')
		.find((r) => r.startsWith(`${key}=`))
		?.split('=')[1];
	return found ? decodeURIComponent(found) : null;
}

function readLocal(key: string): string | null {
	if (!browser) return null;
	const val = localStorage.getItem(key);
	return val ? decodeURIComponent(val) : null;
}

function writeCookie(key: string, value: string) {
	document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${TEN_YEARS * 24 * 60 * 60}`;
}

// cookie first → localStorage fallback → default
function readWithFallback(key: string, fallback: string): string {
	const cookie = readCookie(key);
	``;
	if (cookie) return cookie;

	const local = readLocal(key);
	if (local) {
		// found in localStorage — promote to cookie
		if (browser) writeCookie(key, local);
		return local;
	}

	return fallback;
}

// ————————————————————————————————————————
// Theme
// ————————————————————————————————————————
export const themes = ['light', 'dark', 'system'] as const;
export type Theme = (typeof themes)[number];
const themeClasses = themes.filter((t) => t !== 'system');

function createThemeStore() {
	let theme = $state<Theme>(readWithFallback('theme', 'system') as Theme);

	return {
		get current() {
			return theme;
		},
		set current(v: Theme) {
			theme = v;
			if (browser) writeCookie('theme', v);
		}
	};
}

export const themeStore = register('theme', createThemeStore());

export function applyTheme(theme: Theme) {
	document.documentElement.classList.remove(...themeClasses);
	if (theme === 'system') {
		const resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		document.documentElement.classList.add(resolved);
	} else {
		document.documentElement.classList.add(theme);
	}
}

// ————————————————————————————————————————
// Units
// ————————————————————————————————————————
export type Units = 'kelvin' | 'celsius' | 'fahrenheit';

function createUnitStore() {
	let unit = $state<Units>(readWithFallback('unit', 'celsius') as Units);

	return {
		get current() {
			return unit;
		},
		set current(v: Units) {
			unit = v;
			if (browser) writeCookie('unit', v);
		}
	};
}

export const unitStore = register('unit', createUnitStore());
// ————————————————————————————————————————
// Name
// ————————————————————————————————————————
function createNameStore() {
	let name = $state<string>(readWithFallback('name', 'User'));

	return {
		get current() {
			return name;
		},
		set current(v: string) {
			name = v;
			if (browser) writeCookie('name', v);
		}
	};
}

export const nameStore = register('name', createNameStore());

export interface SearchEntry {
	city: string;
	timestamp: number;
	data: FormattedData;
	tip?: string;
}

function createHistoryStore() {
	const raw = readLocal('weather_search_history');
	let history = $state<SearchEntry[]>(raw ? JSON.parse(raw) : []);

	function save() {
		if (browser) localStorage.setItem('weather_search_history', JSON.stringify(history));
	}

	return {
		get current() {
			return history;
		},

		add(city: string, data: FormattedData, tip?: string) {
			const entry = { city, timestamp: Date.now(), data, tip };
			history = [entry, ...history].slice(0, 5); // keep newest 5
			save();
			return entry.timestamp;
		},

		updateTip(timestamp: number, tip: string) {
			const entry = history.find((e) => e.timestamp === timestamp);
			if (entry) {
				entry.tip = tip;
				save();
			}
		},

		remove(timestamp: number) {
			history = history.filter((e) => e.timestamp !== timestamp);
			save();
		},

		clear() {
			history = [];
			if (browser) localStorage.removeItem('weather_search_history');
		}
	};
}

export const historyStore = createHistoryStore();
