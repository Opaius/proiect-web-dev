import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import type { Env } from '@sveltejs/kit';
import * as v from 'valibot';
import { type paths } from '$lib/types/openweather.d';
import createClient from 'openapi-fetch';

interface Bindings extends Env {
	OPENWEATHER_KEY: string;
	OPENROUTER_API_KEY: string;
}

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

const app = new Hono<{ Bindings: Bindings; Variables: { env: Bindings } }>().basePath('/api');

async function getWeatherByCoords(cords: { lon: number; lat: number }, env: Env) {
	const { data } = await client.GET('/weather', {
		params: {
			query: {
				lon: cords.lon.toString(),
				lat: cords.lat.toString(),
				units: 'metric',
				appId: env.OPENWEATHER_KEY
			}
		}
	});
	return data;
}

export function gradesToText(degrees: number): { abbr: string; label: string } {
	const dirs = [
		{ abbr: 'N', label: 'North' },
		{ abbr: 'NNE', label: 'North-North-East' },
		{ abbr: 'NE', label: 'North-East' },
		{ abbr: 'ENE', label: 'East-North-East' },
		{ abbr: 'E', label: 'East' },
		{ abbr: 'ESE', label: 'East-South-East' },
		{ abbr: 'SE', label: 'South-East' },
		{ abbr: 'SSE', label: 'South-South-East' },
		{ abbr: 'S', label: 'South' },
		{ abbr: 'SSW', label: 'South-South-West' },
		{ abbr: 'SW', label: 'South-West' },
		{ abbr: 'WSW', label: 'West-South-West' },
		{ abbr: 'W', label: 'West' },
		{ abbr: 'WNW', label: 'West-North-West' },
		{ abbr: 'NW', label: 'North-West' },
		{ abbr: 'NNW', label: 'North-North-West' }
	];

	const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
	return dirs[index];
}

function formatData(data: Awaited<ReturnType<typeof getWeatherByCoords>>) {
	const windDir = gradesToText(data?.wind?.deg ?? 0);

	return {
		temp_celsius: data?.main?.temp,
		humidity: data?.main?.humidity,
		weather_id: data?.weather?.[0]?.id,
		description: data?.weather?.[0]?.description,
		icon: data?.weather?.[0]?.icon,
		wind_speed: data?.wind?.speed,
		wind_direction: windDir,
		sunrise: data?.sys?.sunrise,
		sunset: data?.sys?.sunset,
		city: data?.name,
		country: data?.sys?.country,
		coords: {
			lat: data?.coord?.lat,
			lon: data?.coord?.lon
		},
		pressure: data?.main?.pressure
	};
}
export type FormattedData = ReturnType<typeof formatData>;

app.post('/openrouter', async (c) => {
	const env = c.env as Env;
	const body = await c.req.json();

	const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
			'HTTP-Referer': 'https://your-site.com',
			'X-Title': 'Your App Name'
		},
		body: JSON.stringify({
			model: body.model,
			messages: body.messages,
			max_tokens: body.max_tokens ?? 512
		})
	});

	if (!res.ok) {
		const err = await res.text();
		return c.text(err, res.status as any);
	}

	const data = await res.json();
	return c.json(data);
});

const routes = app
	.get('/current-weather', vValidator('query', currentWeatherSchema), async (c) => {
		const env = c.env as Env;
		const { lat, lon } = c.req.valid('query');
		const data = await getWeatherByCoords({ lat, lon }, env);
		const formatted = formatData(data);
		return c.json({ formatted });
	})
.get('/current-weather/:city', vValidator('param', weatherForCitySchema), async (c) => {
		const env = c.env as unknown as Bindings;
		const city = c.req.valid('param').city;

		const geoRes = await fetch(
			`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${env.OPENWEATHER_KEY}`
		);
		const geoData = await geoRes.json();

		if (!geoRes.ok) {
			throw new Error(`Geo API error: ${geoRes.status} - ${JSON.stringify(geoData)}`);
		}
		if (!geoData.length) throw new Error(`City not found: ${city}`);

		const { lat, lon } = geoData[0];

		const data = await getWeatherByCoords({ lat, lon }, env);
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
			description: data.description,
			extract: data.extract,
			thumbnail: data.thumbnail?.source
		});
	});
export default app;

export type AppType = typeof routes;