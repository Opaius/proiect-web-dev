<script lang="ts">
	let { children } = $props();
	import './layout.css';
</script>

<div class="flex max-w-svw gap-2">
	<div class="w-50 bg-blue-300 p-4">Fetch wether now</div>
	{@render children?.()}
</div>
