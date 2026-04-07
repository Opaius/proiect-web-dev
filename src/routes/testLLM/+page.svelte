<script lang="ts">
	import { browser } from '$app/environment';

	let statusText = $state('Model not loaded.');
	let progress = $state(0);
	let isReady = $state(false);
	let isLoading = $state(false);
	let isGenerating = $state(false);
	let userInput = $state('It is 15°C and raining. Do I need an umbrella?');
	let aiResponse = $state<string | null>(null);

	let pipe: any = null;

	const model = 'Xenova/TinyLlama-1.1B-Chat-v1.0';
	async function initModel() {
		if (!browser) return;
		isLoading = true;

		try {
			const { pipeline, env } = await import('@huggingface/transformers');

			// Try WebGPU, fall back to WASM automatically
			env.remoteHost = 'http://localhost:5173/api/model-proxy';
			env.remotePathTemplate = '{model}/resolve/{revision}/';
			pipe = await pipeline('text-generation', model, {
				dtype: 'q4',
				device: 'webgpu', // falls back to 'wasm' automatically if unavailable
				progress_callback: (p: any) => {
					if (p.progress) {
						progress = Math.round(p.progress);
						statusText = `Downloading... ${progress}%`;
					}
				}
			});

			isReady = true;
			statusText = 'Model ready!';
		} catch (e) {
			// retry with wasm explicitly
			try {
				const { pipeline, env } = await import('@huggingface/transformers');
				env.remoteHost = 'http://localhost:5173/api/model-proxy';
				env.remotePathTemplate = '{model}/resolve/{revision}/';
				pipe = await pipeline('text-generation', model, {
					dtype: 'q4f16',
					device: 'wasm',
					progress_callback: (p: any) => {
						if (p.progress) {
							progress = Math.round(p.progress);
							statusText = `Downloading... ${progress}%`;
						}
					}
				});
				isReady = true;
				statusText = 'Model ready (WASM mode)!';
			} catch (err) {
				statusText = `Error: ${err instanceof Error ? err.message : String(err)}`;
			}
		} finally {
			isLoading = false;
		}
	}

	async function generate() {
		if (!pipe || !userInput.trim()) return;
		isGenerating = true;
		aiResponse = null;

		try {
			const messages = [{ role: 'user', content: userInput }];
			const prompt = pipe.tokenizer.apply_chat_template(messages, {
				tokenize: false,
				add_generation_prompt: true
			});
			const result = await pipe(prompt, { max_new_tokens: 256, return_full_text: false });
			aiResponse = result[0]?.generated_text ?? 'No response.';
		} catch (e) {
			aiResponse = `Error: ${e instanceof Error ? e.message : String(e)}`;
		} finally {
			isGenerating = false;
		}
	}
</script>

<main class="mx-auto my-10 max-w-2xl space-y-8 px-6">
	<div class="space-y-2">
		<h2 class="text-3xl font-bold tracking-tight">Local AI</h2>
		<p class="text-muted-foreground">Runs in your browser — no server needed.</p>
	</div>

	<div class="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium">{statusText}</p>
			{#if isLoading}
				<span class="text-sm text-muted-foreground">{progress}%</span>
			{/if}
		</div>

		{#if isLoading}
			<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div class="h-full bg-primary transition-all duration-300" style="width: {progress}%"></div>
			</div>
		{/if}

		{#if !isReady && !isLoading}
			<button
				onclick={initModel}
				class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
			>
				Load Model (~200MB)
			</button>
		{/if}
	</div>

	{#if isReady}
		<div class="space-y-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
			<label for="prompt" class="text-sm font-medium">Prompt:</label>
			<textarea
				id="prompt"
				bind:value={userInput}
				rows="3"
				class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			></textarea>

			<button
				onclick={generate}
				disabled={isGenerating}
				class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
			>
				{isGenerating ? 'Generating...' : 'Ask AI'}
			</button>

			{#if aiResponse}
				<div class="rounded-lg border bg-muted p-4">
					<h3 class="mb-2 font-semibold">Response:</h3>
					<p class="text-sm whitespace-pre-wrap text-muted-foreground">{aiResponse}</p>
				</div>
			{/if}
		</div>
	{/if}
</main>
