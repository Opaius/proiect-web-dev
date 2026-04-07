import { loadPreferences } from '$lib/hooks/localStorage.svelte';

export function load({ cookies }) {
	return loadPreferences(cookies);
}
