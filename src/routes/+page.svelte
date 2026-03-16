<script lang="ts">
	const url = 'https://api.openweathermap.org/data/2.5/weather';

	const newUrl = new URL(url);

	newUrl.searchParams.append('lat', '47.59827872679939');
	newUrl.searchParams.append('lon', '25.65846021139883');

	newUrl.searchParams.append('appid', '5a256b5af8fc601315e21019bc92bb7d');

	let data = $state<any | null>(null);

	const fetchData = async () => {
		const response = await fetch(newUrl);
		const fetchedData = await response.json();
		data = fetchedData;
		
	};
	
</script>

<div class="flex h-svh w-svh flex-col items-center justify-center">
	<button class="rounded bg-blue-500 p-4 text-white" onclick={fetchData}>Fetch Data</button>

	{#if data}
		<pre class="text-balanced max-w-full">{JSON.stringify(data, null, 2)}</pre>
	{:else}
		<p>No data available</p>
	{/if}
</div>
