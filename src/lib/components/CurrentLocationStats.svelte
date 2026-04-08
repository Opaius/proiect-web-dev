<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import type { FormattedData } from '$lib/server/api';
	import { unitStore, type Units } from '$lib/hooks/localStorage.svelte';
	import { createLLM } from '$lib/hooks/llm.svelte';
	import { untrack } from 'svelte';
	import {
		Navigation,
		MapPin,
		Droplets,
		Wind,
		Gauge,
		Sunrise,
		Sunset,
		Compass,
		Sparkles,
		LoaderCircle
	} from '@lucide/svelte';

	interface Props {
		data: FormattedData;
		isCurrentLocation?: boolean;
		tip?: string;
		onTipGenerated?: (tip: string) => void;
	}
	let { data, isCurrentLocation = false, tip: savedTip, onTipGenerated }: Props = $props();
	let unit = $derived(unitStore.current);

	let tip = $state('');
	let tipLoading = $state(false);
	let lastCity = $state('');

	const llm = createLLM();

	function formatTemp(celsius: number | undefined | null, u: Units): string {
		if (celsius == null) return '—';
		switch (u) {
			case 'fahrenheit':
				return `${((celsius * 9) / 5 + 32).toFixed(0)}°F`;
			case 'kelvin':
				return `${(celsius + 273.15).toFixed(0)} K`;
			default:
				return `${celsius.toFixed(0)}°C`;
		}
	}

	async function generateTip() {
		tipLoading = true;
		try {
			await llm.init();
			const temp = formatTemp(data.temp_celsius, unit);
			const locationContext = isCurrentLocation
				? `This is YOUR current location—you're actually here!`
				: `You're viewing ${data.city} remotely.`;
			const prompt = `You're a cheeky, witty weather buddy giving snappy one-liners. Based on the weather, give 2-3 short, playful phrases (not full sentences). Keep it short, fun, and memorable. NO asterisks, NO markdown formatting—just plain text with emojis.

${locationContext}

Weather there: ${temp}, ${data.description}, ${data.humidity}% humidity, ${data.wind_speed?.toFixed(1)} m/s ${data.wind_direction?.label ?? 'wind'}

Examples of style:
- "${temp} and sunny? Sunscreen's your BFF today ☀️"
- "${data.humidity}% humidity—your hair's about to have ideas 💁‍♀️"
- "Wind's wild at ${data.wind_speed?.toFixed(0)} m/s—hold onto your hat!"
- "Grab that umbrella ${data.city}—${data.description} incoming!"

Keep it to 2-3 punchy phrases max. Be playful, not preachy!`;

			await llm.generate([{ role: 'user', content: prompt }], {
				max_new_tokens: 100,
				onToken: (full) => {
					tip = full;
				}
			});

			if (tip && onTipGenerated) {
				onTipGenerated(tip);
			}
		} catch {
			tip = 'My weather brain took a nap ☀️';
		} finally {
			tipLoading = false;
		}
	}

	// React to data changes
	$effect(() => {
		const currentCity = data.city ?? '';

		// Skip if same city (avoid re-triggering)
		if (currentCity === lastCity) return;
		lastCity = currentCity;

		// Reset state
		tip = '';
		tipLoading = false;

		// Check for saved tip
		const currentSavedTip = savedTip;
		if (currentSavedTip) {
			tip = currentSavedTip;
			return;
		}

		// Generate new tip
		untrack(() => generateTip());
	});
</script>

<Card.Root class="h-full overflow-hidden p-0">
	<Card.Content class="flex h-full flex-col p-6">
		{#if isCurrentLocation}
			<div class="mb-1 flex items-center gap-2.5 text-primary">
				<Navigation size={20} />
				<h2 class="text-lg font-semibold tracking-tight">Current Location</h2>
			</div>
		{:else}
			<div class="mb-1 flex items-center gap-2.5 text-primary">
				<MapPin size={20} />
				<h2 class="text-lg font-semibold tracking-tight">Weather</h2>
			</div>
		{/if}

		<div class="mb-5 flex items-baseline gap-1.5">
			<MapPin size={14} class="relative top-[1px] text-muted-foreground" />
			<span class="text-2xl font-bold">{data.city}</span>
			<span class="text-lg text-muted-foreground">{data.country}</span>
		</div>

		<div class="mb-5 flex items-center gap-6">
			<span class="text-5xl font-extrabold tracking-tighter">
				{formatTemp(data.temp_celsius, unit)}
			</span>
			<div class="flex flex-col gap-0.5 text-sm text-muted-foreground">
				<span class="capitalize">{data.description}</span>
			</div>
		</div>

		<Separator class="mb-5" />

		<div class="grid grid-cols-2 gap-4">
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
					<Droplets size={16} class="text-muted-foreground" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted-foreground">Humidity</span>
					<span class="text-sm font-semibold">{data.humidity}%</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
					<Wind size={16} class="text-muted-foreground" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted-foreground">Wind</span>
					<span class="text-sm font-semibold">{data.wind_speed?.toFixed(1)} m/s</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
					<Compass size={16} class="text-muted-foreground" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted-foreground">Wind Direction</span>
					<span class="text-sm font-semibold">{data.wind_direction.label ?? '—'}</span>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
					<Gauge size={16} class="text-muted-foreground" />
				</div>
				<div class="flex flex-col">
					<span class="text-xs text-muted-foreground">Pressure</span>
					<span class="text-sm font-semibold">{data.pressure} hPa</span>
				</div>
			</div>

			<div class="col-span-2 flex items-start gap-3">
				<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
					<Sunrise size={16} class="text-muted-foreground" />
				</div>
				<div class="flex flex-col gap-3 sm:flex-row sm:gap-8">
					<div class="flex flex-col">
						<span class="text-xs text-muted-foreground">Sunrise</span>
						<span class="text-sm font-semibold">
							{#if data.sunrise}{new Date(data.sunrise * 1000).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit'
								})}{/if}
						</span>
					</div>
					<div class="flex flex-col">
						<span class="text-xs text-muted-foreground">Sunset</span>
						<span class="text-sm font-semibold">
							{#if data.sunset}{new Date(data.sunset * 1000).toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit'
								})}{/if}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- AI Tip -->
		{#if tipLoading || tip}
			<Separator class="my-5" />
			<div class="flex gap-2.5">
				<Sparkles size={16} class="mt-0.5 shrink-0 text-primary" />
				{#if tipLoading && !tip}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<LoaderCircle size={14} class="animate-spin" />
						<span>Thinking of tips...</span>
					</div>
				{:else}
					<p class="text-sm leading-relaxed text-muted-foreground">{tip}</p>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
