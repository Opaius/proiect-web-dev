import { browser } from '$app/environment';

const OPENROUTER_MODEL = 'openrouter/free';
const RETRY_DELAY = 2000;

export function createLLM() {
	let state = $state({
		loading: false,
		progress: 0,
		status: '',
		ready: false,
		error: null as string | null
	});

	async function init() {
		if (!browser) return;
		state.ready = true;
		state.status = 'Ready';
	}

	async function generate(
		messages: Array<{ role: string; content: string }>,
		opts: { max_new_tokens?: number; onToken?: (t: string) => void } = {}
	): Promise<string> {
		let lastError: Error | null = null;
		let attempt = 0;

		while (true) {
			try {
				const res = await fetch('/api/openrouter', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: OPENROUTER_MODEL,
						messages,
						max_tokens: opts.max_new_tokens ?? 512,
						stream: true
					})
				});

				if (res.status === 429 || res.status === 503 || res.status === 502) {
					lastError = new Error(`API returned ${res.status}`);
					await delay(RETRY_DELAY * (attempt + 1));
					continue;
				}

				if (!res.ok) {
					const err = await res.text();
					throw new Error(`API error: ${res.status} ${err}`);
				}

				const contentType = res.headers.get('content-type') ?? '';

				// Non-streaming fallback
				if (!contentType.includes('text/event-stream')) {
					const data = await res.json();
					const text = data.choices?.[0]?.message?.content ?? '';
					opts.onToken?.(text);
					return text;
				}

				// Stream SSE
				const reader = res.body!.getReader();
				const decoder = new TextDecoder();
				let full = '';
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed.startsWith('data: ')) continue;
						const payload = trimmed.slice(6);
						if (payload === '[DONE]') break;

						try {
							const json = JSON.parse(payload);
							const delta = json.choices?.[0]?.delta?.content;
							if (delta) {
								full += delta;
								opts.onToken?.(full);
							}
						} catch {
							// skip malformed chunks
						}
					}
				}

				if (full.length > 0) return full;

				// Empty response — retry
				lastError = new Error('Empty streaming response');
				await delay(RETRY_DELAY * (attempt + 1));
				continue;
			} catch (e: any) {
				lastError = e;
				await delay(RETRY_DELAY * (attempt + 1));
			}
		}

		// This should never be reached, but just in case
		throw lastError ?? new Error('LLM request failed');
	}

	function dispose() {
		state.ready = false;
		state.status = '';
		state.error = null;
	}

	return {
		get loading() {
			return state.loading;
		},
		get progress() {
			return state.progress;
		},
		get status() {
			return state.status;
		},
		get ready() {
			return state.ready;
		},
		get error() {
			return state.error;
		},
		init,
		generate,
		dispose
	};
}

function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
