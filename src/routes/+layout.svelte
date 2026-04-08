<script lang="ts">
	let { children, data } = $props();
	import './layout.css';
	import '@fontsource-variable/roboto-serif';
	import '@fontsource-variable/space-grotesk';
	import { applyPreferences } from '$lib/hooks/localStorage.svelte.js';

	// svelte-ignore state_referenced_locally
	applyPreferences(data);
</script>

{@render children?.()}
