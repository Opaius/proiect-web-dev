<script lang="ts">
	import { onMount } from 'svelte';
	import { createLLM } from '$lib/hooks/llm.svelte';

	const llm = createLLM();

	onMount(() => {
		llm.init();
		return () => llm.dispose();
	});

	let isOpen = $state(false);
	let message = $state('');
	let response = $state<string | null>(null);
	let isGenerating = $state(false);

	function toggleChat() {
		isOpen = !isOpen;
		if (!isOpen) {
			message = '';
			response = null;
		}
	}

	async function sendMessage() {
		if (!message.trim() || isGenerating) return;
		if (!llm.ready) {
			response = 'Model is not ready yet. Please wait for it to load.';
			return;
		}

		isGenerating = true;
		response = '';

		try {
			const result = await llm.generate(
				[
					{ role: 'system', content: 'You are a helpful assistant. Keep answers concise.' },
					{ role: 'user', content: message }
				],
				{
					max_new_tokens: 256,
					onToken: (token: string) => {
						response += token;
					}
				}
			);
			if (!response) response = result;
		} catch (e) {
			response = `Error: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			isGenerating = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function getStatusLabel(): string {
		if (llm.loading) return llm.status || 'Loading...';
		if (llm.ready) return 'Ready';
		if (llm.status?.startsWith('Error')) return llm.status;
		return 'Click to load';
	}
</script>

<!-- Floating Toggle Button -->
<button
	onclick={toggleChat}
	class="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-110 active:scale-95"
	aria-label="Toggle chat"
>
	{#if !llm.ready && llm.loading}
		<!-- Spinner while loading -->
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
		></div>
	{:else if !isOpen}
		<!-- Chat icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-primary-foreground"
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
		</svg>
	{:else}
		<!-- Close icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-primary-foreground"
		>
			<path d="M18 6 6 18"></path>
			<path d="m6 6 12 12"></path>
		</svg>
	{/if}
</button>

<!-- Chat Panel -->
{#if isOpen}
	<div
		class="fixed right-4 bottom-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-background shadow-xl"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b p-4">
			<h3 class="font-semibold">AI Assistant</h3>
			<span class="text-xs text-muted-foreground">{getStatusLabel()}</span>
		</div>

		<!-- Response area -->
		<div class="max-h-64 min-h-24 overflow-y-auto p-4">
			{#if llm.loading}
				<div class="space-y-2">
					<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {llm.progress}%"
						></div>
					</div>
					<p class="text-xs text-muted-foreground">{llm.status || 'Loading...'}</p>
				</div>
			{:else if response}
				<div class="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{response}</div>
			{:else}
				<p class="text-sm text-muted-foreground">Ask me anything...</p>
			{/if}
		</div>

		<!-- Input area -->
		<div class="border-t p-4">
			<div class="flex gap-2">
				<textarea
					bind:value={message}
					onkeydown={handleKeydown}
					placeholder="Type a message..."
					disabled={isGenerating}
					class="flex min-h-10 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					rows="1"
				></textarea>
				<button
					onclick={sendMessage}
					disabled={!message.trim() || isGenerating || !llm.ready}
					class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{#if isGenerating}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
						></div>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="m22 2-7 20-4-9-9-4Z"></path>
							<path d="M22 2 11 13"></path>
						</svg>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
