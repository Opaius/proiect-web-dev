<script lang="ts">
	import { browser } from '$app/environment';
	import * as Select from '$lib/components/ui/select/index.js';
	import { applyTheme, themeStore, unitStore } from '$lib/hooks/localStorage.svelte';

	const units = [
		{ value: 'celsius', label: 'Celsius (°C)' },
		{ value: 'fahrenheit', label: 'Fahrenheit (°F)' },
		{ value: 'kelvin', label: 'Kelvin (K)' }
	];

	const triggerContent = $derived(
		units.find((u) => u.value === unitStore.current)?.label ?? 'Select unit'
	);
	$effect(() => {
		if (browser) applyTheme(themeStore.current);
	});
</script>

<Select.Root type="single" name="temperatureUnit" bind:value={unitStore.current}>
	<Select.Trigger class="w-full">
		{triggerContent}
	</Select.Trigger>
	<Select.Content>
		<Select.Group>
			<Select.Label>Temperature unit</Select.Label>
			{#each units as unit (unit.value)}
				<Select.Item value={unit.value} label={unit.label}>
					{unit.label}
				</Select.Item>
			{/each}
		</Select.Group>
	</Select.Content>
</Select.Root>
