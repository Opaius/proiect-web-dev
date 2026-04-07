<script lang="ts">
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import WavesIcon from '@lucide/svelte/icons/waves';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import { themes, themeStore } from '$lib/hooks/localStorage.svelte';
	import type { Theme } from '$lib/hooks/localStorage.svelte';
	import * as Select from '$lib/components/ui/select';

	const themeConfig: Record<Theme, { label: string; icon: any }> = {
		light: { label: 'Light', icon: SunIcon },
		dark: { label: 'Dark', icon: MoonIcon },
		system: { label: 'System', icon: MonitorIcon },
		ocean: { label: 'Ocean', icon: WavesIcon }
	};
</script>

<Select.Root
	type="single"
	value={themeStore.current}
	onValueChange={(v) => (themeStore.current = v as Theme)}
>
	<Select.Trigger class="w-full justify-start">
		{@const config = themeConfig[themeStore.current]}
		<config.icon size="16" />
		{config.label}
	</Select.Trigger>
	<Select.Content>
		{#each themes as theme}
			{@const config = themeConfig[theme]}
			<Select.Item value={theme} class="flex">
				<config.icon size="16" />
				{config.label}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
