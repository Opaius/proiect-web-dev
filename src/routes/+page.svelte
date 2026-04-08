<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';
	import { MarkerLabel } from '$lib/components/ui/map';
	import Map from '$lib/components/ui/map/Map.svelte';
	import MapFlyTo from '$lib/components/ui/map/MapFlyTo.svelte';
	import MapMarker from '$lib/components/ui/map/MapMarker.svelte';
	import MarkerContent from '$lib/components/ui/map/MarkerContent.svelte';
	import NameEdit from '$lib/components/ui/NameEdit.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import UnitToggle from '$lib/components/ui/UnitToggle.svelte';
	import { historyStore } from '$lib/hooks/localStorage.svelte';
	import { weatherThemeStore } from '$lib/hooks/weatherTheme.svelte';
	import { createLocation } from '$lib/hooks/location.svelte';
	import { client } from '$lib/rpcClient';
	import type { FormattedData } from '$lib/server/api';
	import CurrentLocationStats from '$lib/components/CurrentLocationStats.svelte';

	import { CalendarFold, Eye, Loader, Settings, Trash, View, Navigation } from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	const location = createLocation();
	let data = $state<null | FormattedData>(null);
	let cityData = $state<null | FormattedData>(null);
	let inputData = $state<undefined | string>(undefined);
	let selectedHistory = $state<number | null>(null);
	let currentLocationTip = $state<string>('');

	$effect(() => {
		location.getLocation();
	});

	$effect(() => {
		if (!location.loading && location.lat && location.lng) {
			(async () => {
				const res = await client.api['current-weather'].$get({
					query: {
						lat: location.lat!.toString(),
						lon: location.lng!.toString()
					}
				});
				if (res.ok) {
					const json = await res.json();
					data = json.formatted ?? null;
				}
			})();
		}
	});

	// Apply weather-based theme
	$effect(() => {
		const weatherData = cityData ?? data;
		if (weatherData?.weather_id) {
			weatherThemeStore.setFromWeatherId(weatherData.weather_id);
		}
	});

	const handleHistoryClick = (timestamp: number, data: FormattedData) => {
		if (selectedHistory === timestamp) {
			selectedHistory = null;
			cityData = null;
		} else {
			selectedHistory = timestamp;
			cityData = data;
		}
	};

	// Get tip for currently selected history item
	const selectedTip = $derived(
		selectedHistory !== null
			? (historyStore.current.find((h) => h.timestamp === selectedHistory)?.tip ?? '')
			: ''
	);

	// Callback when a tip is generated for a searched city
	function handleTipGenerated(tip: string) {
		if (selectedHistory !== null) {
			historyStore.updateTip(selectedHistory, tip);
		}
	}

	const mapCoords = $derived(
		cityData && cityData.coords.lat && cityData.coords.lon
			? {
					lon: cityData.coords.lon,
					lat: cityData.coords.lat
				}
			: data && data.coords.lat && data.coords.lon
				? {
						lon: data.coords.lon,
						lat: data.coords.lat
					}
				: { lon: 27.573931345120904, lat: 47.17512407569707 }
	);

	// Check if we're viewing current location (not a history selection)
	const isViewingCurrentLocation = $derived(
		selectedHistory === null && cityData === null && data !== null
	);
</script>

<div class="flex flex-col items-center">
	<div class="mt-10 flex w-full max-w-[90svw] flex-col gap-10">
		<Card.Root>
			<Card.Content
				class="grid gap-5 sm:grid-cols-2 lg:grid-cols-[auto_1fr_auto] xl:grid-rows-2 2xl:flex"
			>
				<NameEdit />
				<Card.Root class="bg-darker-card 2xl:aspect-square dark:bg-lighter-card">
					<Card.Content class="flex h-full flex-col gap-2">
						<Card.Header class="flex items-center p-0 font-bold"
							><Settings size="15" />Settings</Card.Header
						>
						<UnitToggle />
						<ThemeToggle />
						<Card.Root class="h-full w-full bg-input/50 shadow-none">
							<Card.Content class="flex h-full w-full flex-col items-center justify-center p-4">
								{#if location.loading && !data}
									<div class="flex items-center gap-2">
										<Loader class="size-4 animate-spin" />
										<span>Getting location...</span>
									</div>
								{:else if data}
									<div class="flex items-center gap-2">
										<Navigation size="16" class="text-primary" />
										<span>Your location: {data.city}</span>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					</Card.Content>
				</Card.Root>
				<Card.Root
					class="bg-darker-card pt-10 text-center 2xl:aspect-square dark:bg-lighter-card"
				>
					<Card.Content class="flex h-full flex-col justify-end gap-4">
						<h3 class="max-w-45 self-center text-center font-serif text-xl">
							Hey man, do you want to see the weather for ...
						</h3>
						<div class="flex h-full w-full grow flex-col gap-2 *:grow">
							<Input bind:value={inputData} placeholder="Name of city"></Input>
							<Button
								onclick={async () => {
									if (!inputData || inputData.length == 0) return;
									const res = await client.api['current-weather'][':city'].$get({
										param: {
											city: inputData
										}
									});
									if (res.ok) {
										const json = await res.json();
										// Check if city already in history
										const existing = historyStore.current.find(
											(h) =>
												h.data.coords.lat === json.formatted.coords.lat &&
												h.data.coords.lon === json.formatted.coords.lon
										);
										if (existing) {
											selectedHistory = existing.timestamp;
										} else {
											const timestamp = historyStore.add(
												json.formatted.city!,
												json.formatted
											);
											selectedHistory = timestamp;
										}
										cityData = json.formatted;
										inputData = '';
									}
								}}>Search</Button
							>
						</div>
					</Card.Content>
				</Card.Root>
				<Card.Root
					class="h-full grow bg-darker-card pb-0 lg:col-span-3 2xl:col-span-1 dark:bg-lighter-card"
				>
					<Card.Content class="h-full w-full">
						<Card.Header class="flex items-center p-0 font-bold">
							<CalendarFold size="15" />Quick history (searched cities)</Card.Header
						>
						{#if historyStore.current.length == 0}
							<div class="flex items-center justify-center p-10">
								<span>No search history yet. Search for cities above!</span>
							</div>
						{:else}
							<div class="grid h-full w-full grid-rows-5 gap-1 py-5">
								{#each historyStore.current as history (history.timestamp)}
									<div class="flex h-full w-full items-center rounded-full bg-input/50 pl-0.5">
										<div class="flex">
											<Button
												onclick={() => {
													historyStore.remove(history.timestamp);
													if (selectedHistory === history.timestamp) {
														selectedHistory = null;
														cityData = null;
													}
												}}
												variant="destructive"
												size="icon-sm"
											>
												<Trash />
											</Button>
											<Button
												variant={selectedHistory === history.timestamp
													? 'default'
													: 'secondary'}
												size="icon-sm"
												onclick={() =>
													handleHistoryClick(history.timestamp, history.data)}
											>
												{#if selectedHistory === history.timestamp}
													<Eye size="16" />
												{:else}
													<View />
												{/if}
											</Button>
										</div>
										<div class="flex w-full justify-between px-5">
											<p>{history.city}</p>
											<p class="text-xs text-muted-foreground">
												{new Date(history.timestamp).toLocaleDateString()}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Card.Content>
		</Card.Root>

		<!-- Two-column layout: Map (left) + Stats (right) -->
		<div class="grid w-full grid-cols-1 grid-rows-2 flex-col gap-10 sm:grid-cols-2 sm:grid-rows-1">
			<!-- Map column -->
			<div
				class="row-[2/3] h-full w-full transition-all duration-500 ease-in-out sm:row-auto"
				in:slide={{ duration: 500 }}
			>
				<Card.Root class="h-full overflow-hidden p-0">
					<Map zoom={15}>
						<MapFlyTo center={[mapCoords.lon, mapCoords.lat]} zoom={15} />
						<MapMarker longitude={27.573931345120904} latitude={47.17512407569707}>
							<MarkerContent>
								<div
									class="size-5 cursor-pointer rounded-full border-4 border-accent bg-primary"
								></div>
								<MarkerLabel position="bottom" class="font-sans font-thin"
									>The first University of Romania</MarkerLabel
								>
							</MarkerContent>
						</MapMarker>
						{#if location.lat && location.lng && !cityData}
							<MapMarker longitude={location.lng} latitude={location.lat}>
								<MarkerContent>
									<div
										class="size-5 cursor-pointer rounded-full border-4 border-accent bg-primary"
									></div>
									<MarkerLabel position="bottom" class="font-sans font-thin"
										>📍 Your current location</MarkerLabel
									>
								</MarkerContent>
							</MapMarker>
						{/if}
						{#if cityData && cityData.coords.lat && cityData.coords.lon}
							<MapMarker longitude={cityData.coords.lon} latitude={cityData.coords.lat}>
								<MarkerContent>
									<div
										class="size-5 cursor-pointer rounded-full border-4 border-accent bg-secondary"
									></div>
									<MarkerLabel position="bottom" class="font-sans font-thin"
										>🔍 {cityData.city} (searched)</MarkerLabel
									>
								</MarkerContent>
							</MapMarker>
						{/if}
					</Map>
				</Card.Root>
			</div>

			<!-- Stats column -->
			<div class="w-full" in:slide={{ duration: 500, delay: 200 }}>
				{#if isViewingCurrentLocation && data}
					<CurrentLocationStats
						isCurrentLocation
						{data}
						tip={currentLocationTip}
						onTipGenerated={(tip) => (currentLocationTip = tip)}
					/>
				{:else if selectedHistory !== null && cityData}
					<CurrentLocationStats
						data={cityData}
						tip={selectedTip}
						onTipGenerated={handleTipGenerated}
					/>
				{:else if data}
					<Card.Root class="h-[50svh] overflow-hidden p-0">
						<Card.Content class="flex h-full items-center justify-center">
							<div class="text-center">
								<p class="mb-2 text-muted-foreground">
									Select a city from history to view its stats
								</p>
								<p class="text-sm text-muted-foreground">
									Above you're viewing: <strong>{data.city}</strong>
								</p>
							</div>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root class="h-[50svh] overflow-hidden p-0">
						<Card.Content class="flex h-full items-center justify-center">
							<div class="text-center text-muted-foreground">
								<Loader class="mx-auto mb-4 size-8 animate-spin" />
								<p>Getting your location...</p>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</div>
</div>
