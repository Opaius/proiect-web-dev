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
	import { createLocation } from '$lib/hooks/location.svelte';
	import { client } from '$lib/rpcClient';
	import type { FormattedData } from '$lib/server/api';

	import { CalendarFold, Loader, Settings, Trash, View } from '@lucide/svelte';

	const location = createLocation();
	let data = $state<null | FormattedData>(null);

	let cityData = $state<null | FormattedData>(null);
	let inputData = $state<undefined | string>(undefined);

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
				: { lon: 27.573931345120904, lat: 47.17512407569707 } // lon first
	);
</script>

<div class=" flex flex-col items-center">
	<div class="mt-10 flex w-full max-w-[80svw] flex-col gap-10">
		<Card.Root>
			<Card.Content class="flex flex-row gap-5">
				<NameEdit />
				<Card.Root class="aspect-square bg-darker-card dark:bg-lighter-card ocean:bg-lighter-card">
					<Card.Content class="flex h-full flex-col gap-2">
						<Card.Header class="flex items-center p-0 font-bold"
							><Settings size="15" />Settings</Card.Header
						>
						<UnitToggle />
						<ThemeToggle />
						<Card.Root class="h-full w-full bg-input/50 shadow-none">
							<Card.Content class="flex h-full w-full flex-col items-center justify-center">
								{#if location.loading && !data}
									Getting location <Loader class="size-4 animate-spin" />
								{:else}
									Your location is <span>{data?.city}</span>
								{/if}
							</Card.Content>
						</Card.Root>
					</Card.Content>
				</Card.Root>
				<Card.Root
					class="bg-darker-car aspect-square  pt-10 text-center dark:bg-lighter-card ocean:bg-lighter-card"
				>
					<Card.Content class="flex h-full max-w-fit flex-col justify-end gap-4">
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
										historyStore.add(json.formatted.city!, json.formatted);
										cityData = json.formatted;
									}
								}}>Search</Button
							>
						</div></Card.Content
					>
				</Card.Root>
				<Card.Root class="grow bg-darker-card pb-0 dark:bg-lighter-card ocean:bg-lighter-card">
					<Card.Content class="h-full w-full">
						<Card.Header class="flex items-center p-0 font-bold">
							<CalendarFold size="15" />Quick history</Card.Header
						>
						{#if historyStore.current.length == 0}
							<div class="flex h-full w-full items-center justify-center">
								<span>No history</span>
							</div>
						{:else}
							<div class="grid h-full w-full grid-rows-5 gap-1 py-5">
								{#each historyStore.current as history (history.timestamp)}
									<div class="flex h-full w-full items-center rounded-full bg-input/50 pl-0.5">
										<div class="flex">
											<Button
												onclick={() => {
													historyStore.remove(history.timestamp);
												}}
												variant="destructive"
												size="icon-sm"
											>
												<Trash />
											</Button>
											<Button variant="secondary" size="icon-sm"><View /></Button>
										</div>
										<div class="flex w-full justify-between px-5">
											<p>{history.city}</p>
											<p>{new Date(history.timestamp).toDateString()}</p>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</Card.Content>
		</Card.Root>
		<Card.Root class="h-[40svh] w-full overflow-hidden p-0 ">
			<Map zoom={15}>
				<MapFlyTo center={[mapCoords.lon, mapCoords.lat]} zoom={15} />
				<MapMarker longitude={27.573931345120904} latitude={47.17512407569707}>
					<MarkerContent>
						<div class="size-5 cursor-pointer rounded-full border-4 border-accent bg-primary"></div>
						<MarkerLabel position="bottom" class="font-sans font-thin"
							>The first University of Romania</MarkerLabel
						>
					</MarkerContent>
				</MapMarker>
				{#if location.lat && location.lng}
					<MapMarker longitude={location.lng} latitude={location.lat}>
						<MarkerContent>
							<div
								class="size-5 cursor-pointer rounded-full border-4 border-accent bg-primary"
							></div>
							<MarkerLabel position="bottom" class="font-sans font-thin"
								>Your current location</MarkerLabel
							>
						</MarkerContent>
					</MapMarker>
				{/if}
			</Map>
		</Card.Root>
	</div>
</div>
