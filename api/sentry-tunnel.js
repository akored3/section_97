// Forwards Sentry envelopes from the browser to Sentry's ingestion endpoint.
// Keeps events flowing when ad blockers block sentry.io directly — requests
// go to /api/sentry-tunnel (same origin as the site) and this function
// relays them upstream.
//
// Runs on Vercel Edge Runtime: no cold starts, fetch-native, cheap.

export const config = { runtime: 'edge' };

const SENTRY_HOST = 'o4511247297544192.ingest.us.sentry.io';
const ALLOWED_PROJECT_IDS = ['4511247300100096'];

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const envelope = await request.text();
        const headerLine = envelope.split('\n', 1)[0];
        const header = JSON.parse(headerLine);
        const dsn = new URL(header.dsn);

        if (dsn.hostname !== SENTRY_HOST) {
            return new Response('Invalid Sentry host', { status: 400 });
        }

        const projectId = dsn.pathname.replace(/^\//, '');
        if (!ALLOWED_PROJECT_IDS.includes(projectId)) {
            return new Response('Invalid Sentry project', { status: 400 });
        }

        const upstream = `https://${SENTRY_HOST}/api/${projectId}/envelope/`;
        const upstreamRes = await fetch(upstream, {
            method: 'POST',
            body: envelope,
        });

        return new Response('', { status: upstreamRes.status });
    } catch (err) {
        return new Response('Tunnel error', { status: 500 });
    }
}
