// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			env: {
				OPENWEATHER_KEY: string;
				OPENROUTER_API_KEY?: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {}
	}
}

export {};
