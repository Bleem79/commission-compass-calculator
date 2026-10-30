import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MAX_URLS = 200;
const FETCH_TIMEOUT = 8000;

// Extract coordinates from a resolved Google Maps URL, mirroring src/utils/driverResidence.ts.
const extractCoordinates = (value: string): { lat: number; lng: number } | null => {
  let candidate = value;
  try {
    candidate = decodeURIComponent(value);
  } catch {
    // keep the raw value
  }
  const place = candidate.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const pair = place || candidate.match(/(?:@|[?&](?:q|query|ll)=|\/search\/)(-?\d{1,3}(?:\.\d+)?),\s*\+?(-?\d{1,3}(?:\.\d+)?)/);
  if (!pair) return null;
  const lat = Number(pair[1]);
  const lng = Number(pair[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !userData.user) return json({ error: 'Please sign in again.' }, 401);
    const { data: isAdmin, error: roleError } = await client.rpc('has_admin_role', { user_id: userData.user.id });
    if (roleError || !isAdmin) return json({ error: 'Administrator access required.' }, 403);

    const body = await req.json().catch(() => null);
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];
    const cleaned = [...new Set(urls.map((url: unknown) => (typeof url === 'string' ? url.trim() : '')).filter(Boolean))];
    if (!cleaned.length) return json({ results: {} });
    if (cleaned.length > MAX_URLS) return json({ error: `Resolve at most ${MAX_URLS} links per request.` }, 400);

    // URLs may only be Google Maps links, matching the client-side coordinate parser.
    for (const url of cleaned) {
      try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol) || !/^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i.test(parsed.hostname)) {
          return json({ error: 'Only Google Maps links can be resolved.' }, 400);
        }
      } catch {
        return json({ error: 'Only Google Maps links can be resolved.' }, 400);
      }
    }

    const service = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Only successful lookups are trusted from cache; failed ones are retried.
    const { data: cached } = await service.from('driver_residence_links').select('url,lat,lng').in('url', cleaned).not('lat', 'is', null).not('lng', 'is', null);
    const results: Record<string, { lat: number; lng: number } | null> = {};
    for (const row of cached ?? []) results[row.url] = { lat: row.lat, lng: row.lng };

    const pending = cleaned.filter(url => !(url in results));
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
      for (;;) {
        const url = queue.shift();
        if (!url) return;
        let found: { lat: number; lng: number } | null = null;
        try {
          // Follow redirects by hand: the first Location header already carries the coordinates,
          // while following to the end can land on a consent/bot-check page without them.
          let current = url;
          for (let hop = 0; hop < 5 && !found; hop++) {
            const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT), headers: { 'User-Agent': 'curl/8.0' } });
            const location = response.headers.get('location');
            await response.body?.cancel().catch(() => {});
            if (!location) break;
            current = new URL(location, current).toString();
            found = extractCoordinates(current);
            // Bot-check pages wrap the real target in a "continue" parameter.
            if (!found) {
              const cont = new URL(current).searchParams.get('continue');
              if (cont) found = extractCoordinates(cont);
            }
          }
        } catch (error) {
          console.error('resolve failed', url, error);
          found = null;
        }
        results[url] = found;
        if (found) await service.from('driver_residence_links').upsert({ url, lat: found.lat, lng: found.lng, resolved_at: new Date().toISOString() });
      }
    });
    await Promise.all(workers);

    return json({ results });
  } catch (error) {
    console.error('resolve-residence-links failed:', error);
    return json({ error: 'Unable to resolve map links right now.' }, 500);
  }
});
