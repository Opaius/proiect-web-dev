<script lang="ts">
	import { getContext } from 'svelte';
	import type { Map } from 'maplibre-gl';

	let { center, zoom = 13 }: { center: [number, number]; zoom?: number } = $props();

	const { getMap, isLoaded } = getContext<{
		getMap: () => Map | null;
		isLoaded: () => boolean;
	}>('map');

	$effect(() => {
		const [lon, lat] = center;

		const map = getMap();
		if (!map || !isLoaded()) return;

		map.flyTo({
			center: [lon, lat],
			zoom,
			duration: 1500,
			essential: true
		});
	});
</script>
