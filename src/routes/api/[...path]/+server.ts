import app from '$lib/server/api';
import type { RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = ({ request, platform }) => {
	return app.fetch(request, platform?.env, platform?.context);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
