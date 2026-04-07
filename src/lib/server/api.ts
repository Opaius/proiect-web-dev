import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import * as v from 'valibot';
import { type paths } from '$lib/types/openweather.d';
import createClient from 'openapi-fetch';

import { OPENWEATHER_KEY, HF_TOKEN } from '$env/static/private';

const client = createClient<paths>({
	baseUrl: 'https://api.openweathermap.org/data/2.5'
});

const currentWeatherSchema = v.object({
	lat: v.pipe(v.string(), v.transform(Number), v.number()),
	lon: v.pipe(v.string(), v.transform(Number), v.number())
});

const weatherForCitySchema = v.object({
	city: v.pipe(v.string(), v.minLength(3))
});

const app = new Hono().basePath('/api');

async function getWeatherByCoords(cords: { lon: number; lat: number }) {
	const { data, error } = await client.GET('/weather', {
		params: {
			query: {
				lon: cords.lon.toString(),
				lat: cords.lat.toString(),
				units: 'metric',
				appId: OPENWEATHER_KEY
			}
		}
	});
	return data;
}
// src/lib/utils/wind.ts

export function gradesToText(degrees: number): { abbr: string; label: string } {
	const dirs = [
		{ abbr: 'N', label: 'Nord' },
		{ abbr: 'NNE', label: 'Nord-Nord-Est' },
		{ abbr: 'NE', label: 'Nord-Est' },
		{ abbr: 'ENE', label: 'Est-Nord-Est' },
		{ abbr: 'E', label: 'Est' },
		{ abbr: 'ESE', label: 'Est-Sud-Est' },
		{ abbr: 'SE', label: 'Sud-Est' },
		{ abbr: 'SSE', label: 'Sud-Sud-Est' },
		{ abbr: 'S', label: 'Sud' },
		{ abbr: 'SSW', label: 'Sud-Sud-Vest' },
		{ abbr: 'SW', label: 'Sud-Vest' },
		{ abbr: 'WSW', label: 'Vest-Sud-Vest' },
		{ abbr: 'W', label: 'Vest' },
		{ abbr: 'WNW', label: 'Vest-Nord-Vest' },
		{ abbr: 'NW', label: 'Nord-Vest' },
		{ abbr: 'NNW', label: 'Nord-Nord-Vest' }
	];

	const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
	return dirs[index];
}

function formatData(data: Awaited<ReturnType<typeof getWeatherByCoords>>) {
	const windDir = gradesToText(data?.wind?.deg ?? 0);

	return {
		// 🌡️ Temperature (need all 3 units)
		temp_celsius: data?.main?.temp, // metric from API
		temp_fahrenheit: data?.main?.temp ? (data.main.temp * 9) / 5 + 32 : null,
		temp_kelvin: data?.main?.temp ? data.main.temp + 273.15 : null,
		grnd_level: data?.main?.grnd_level,

		// 💧 Humidity
		humidity: data?.main?.humidity,

		// 🌤️ Weather condition (for UI theme switching)
		weather_id: data?.weather?.[0]?.id, // numeric id for condition logic
		description: data?.weather?.[0]?.description,
		icon: data?.weather?.[0]?.icon,

		// 🌬️ Wind
		wind_speed: data?.wind?.speed,
		wind_direction: windDir, // converted to words

		// 🌅 Sunrise / Sunset
		sunrise: data?.sys?.sunrise,
		sunset: data?.sys?.sunset,

		// 📍 Location
		city: data?.name,
		country: data?.sys?.country,
		coords: {
			lat: data?.coord?.lat,
			lon: data?.coord?.lon
		}
	};
}
export type FormattedData = ReturnType<typeof formatData>;
app.get('/model-proxy/*', async (c) => {
	// Extract path manually since Hono's param capture doesn't work reliably with SvelteKit
	const url = new URL(c.req.url);
	const prefix = '/api/model-proxy/';
	const idx = url.pathname.indexOf(prefix);
	const path = idx >= 0 ? url.pathname.slice(idx + prefix.length) : '';
	console.log('Proxying:', path);

	const res = await fetch(`https://huggingface.co/${path}`, {
		headers: {
			Authorization: `Bearer ${HF_TOKEN}`
		}
	});

	console.log('HF response status:', res.status); // 👈 and this

	if (!res.ok) {
		return c.text(`HF error: ${res.status} ${res.statusText}`, res.status as any);
	}

	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
			'Cache-Control': 'public, max-age=31536000',
			'Access-Control-Allow-Origin': '*'
		}
	});
});
const routes = app
	.get('/current-weather', vValidator('query', currentWeatherSchema), async (c) => {
		const { lat, lon } = c.req.valid('query');
		const data = await getWeatherByCoords({
			lat,
			lon
		});
		const formatted = formatData(data);
		return c.json({ formatted });
	})
	.get('/current-weather/:city', vValidator('param', weatherForCitySchema), async (c) => {
		const city = c.req.valid('param').city;

		const geoRes = await fetch(
			`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_KEY}`
		);
		const geoData = await geoRes.json();

		console.log('oras ', city, ' data ', geoData[0]);

		if (!geoData.length) throw new Error(`City not found: ${city}`);

		const { lat, lon } = geoData[0];

		const data = await getWeatherByCoords({ lat, lon });
		const formatted = formatData(data);

		return c.json({ formatted });
	})
	.get('/city-info/:city', async (c) => {
		const city = c.req.param('city');

		const res = await fetch(
			`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`
		);
		const data = await res.json();

		return c.json({
			title: data.title,
			description: data.description, // short tagline e.g. "City in Romania"
			extract: data.extract, // 2-3 sentence summary
			thumbnail: data.thumbnail?.source // city image
		});
	});
export default app;

export type AppType = typeof routes;
