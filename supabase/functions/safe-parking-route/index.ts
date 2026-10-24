import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const bodySchema = z.object({ parkingId: z.string().uuid(), origin: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }) });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'Please sign in.' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !userData.user) return json({ error: 'Please sign in again.' }, 401);
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Provide valid parking and current-location coordinates.' }, 400);
    const { data: parking, error } = await client.from('safe_parking').select('latitude,longitude').eq('id', parsed.data.parkingId).single();
    if (error || !parking) return json({ error: 'Parking location is unavailable.' }, 404);
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!gatewayKey || !connectionKey) return json({ error: 'Route estimates are not configured. Continue in Google Maps.' }, 503);
    const response = await fetch('https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes', {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration' },
      body: JSON.stringify({ origin: { location: { latLng: parsed.data.origin } }, destination: { location: { latLng: { latitude: parking.latitude, longitude: parking.longitude } } }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE' }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Safe Parking routing [${response.status}]: ${details}`);
      let message = 'Route estimates unavailable. Continue in Google Maps.';
      if (response.status === 403) {
        message = details.includes('API_KEY_HTTP_REFERRER_BLOCKED') ? 'Google Maps server key is referrer-restricted. Set its application restrictions to None or IP addresses in Google Cloud Console.' : details.includes('API_KEY_SERVICE_BLOCKED') ? 'Google Maps server key must allow Routes API in Google Cloud Console.' : 'Google Maps denied the route. Check the server key restrictions in Google Cloud Console.';
      }
      return json({ error: message, status: response.status, details }, response.status);
    }
    const data = await response.json();
    const route = data.routes?.[0];
    if (!route || typeof route.duration !== 'string' || !/^\d+(\.\d+)?s$/.test(route.duration)) return json({ error: 'No reliable driving route found. Continue in Google Maps.' }, 404);
    const seconds = Number(route.duration.slice(0, -1));
    const meters = route.distanceMeters ?? 0;
    if (!Number.isFinite(seconds) || !Number.isFinite(meters) || meters < 0) return json({ error: 'Invalid route estimate. Continue in Google Maps.' }, 502);
    return json({ distanceMeters: meters, durationSeconds: seconds });
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Route estimate unavailable. Continue in Google Maps.' }, 500); }
});