// src/lib/client.ts
import { hc } from 'hono/client';
import type { AppType } from '$lib/server/api';

export const client = hc<AppType>('/');
