<script lang="ts">
	import { nameStore } from '$lib/hooks/localStorage.svelte';

	let name = $state(nameStore.current);
	let editing = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	function startEditing() {
		editing = true;
		setTimeout(() => inputEl?.select(), 0);
	}

	function stopEditing() {
		editing = false;
		if (name != 'User') nameStore.current = name;
		if (!name.trim()) name = 'User';
	}
</script>

<div
	class="p-10 text-center font-serif text-5xl leading-15 font-bold sm:text-left lg:items-center lg:gap-4 xl:flex 2xl:block"
>
	<div>Welcome</div>
	<div>Back</div>
	{#if editing}<input
			bind:this={inputEl}
			bind:value={name}
			onblur={stopEditing}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === 'Escape') stopEditing();
			}}
			maxlength="10"
			class="border-none bg-transparent p-0 text-left font-serif text-5xl leading-15 font-bold outline-none"
			style="width: 7ch"
		/>{:else}<button
			onclick={startEditing}
			onkeydown={(e) => {
				if (e.key === 'Enter') startEditing();
			}}
			type="button"
			title="Click to edit"
			class={`font-inherit cursor-pointer border-none  p-0 text-inherit transition-opacity hover:opacity-80 ${name == 'User' ? 'bg-primary/20' : 'bg-transparent'}`}
			>{name}</button
		>{/if}
</div>
