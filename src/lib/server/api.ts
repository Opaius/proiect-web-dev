import { vValidator } from '@hono/valibot-validator';
import { Hono } from 'hono';
import * as v from 'valibot';
import { type paths } from '$lib/types/openweather.d';
import createClient from 'openapi-fetch';

import { OPENWEATHER_KEY, OPENROUTER_API_KEY } from '$env/static/private';

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
	const { data } = await client.GET('/weather', {
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
		// 🌡️ Temperature (need all 3 units)
		temp_celsius: data?.main?.temp, // metric from API

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
		},

		// 🌡️ Pressure
		pressure: data?.main?.pressure
	};
}
export type FormattedData = ReturnType<typeof formatData>;
app.post('/openrouter', async (c) => {
	const body = await c.req.json();

	const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
