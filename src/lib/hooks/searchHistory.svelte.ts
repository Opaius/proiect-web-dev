const STORAGE_KEY = 'weather_search_history';
const MAX_ENTRIES = 5;

export interface SearchEntry {
	city: string;
	country: string;
	timestamp: number;
}

export function getHistory(): SearchEntry[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	return raw ? JSON.parse(raw) : [];
}

export function addToHistory(city: string, country: string): void {
	const history = getHistory();

	// elimină duplicatul dacă există deja
	const filtered = history.filter((e) => e.city.toLowerCase() !== city.toLowerCase());

	const updated = [{ city, country, timestamp: Date.now() }, ...filtered].slice(0, MAX_ENTRIES);

	localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeFromHistory(city: string): void {
	const history = getHistory().filter((e) => e.city.toLowerCase() !== city.toLowerCase());
	localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
	localStorage.removeItem(STORAGE_KEY);
}
