export interface ResidenceRow {
  driver_id: string;
  city: string | null;
  area: string | null;
  google_map: string | null;
}

export function residenceCoordinates(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const text = value.trim();
  let candidate = text;
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (!/^(www\.)?(google\.[a-z.]+|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl)$/i.test(url.hostname)) return null;
      candidate = decodeURIComponent(url.href);
    } catch { return null; }
  }
  // Prefer the actual place coordinates over an @ map-camera position.
  const place = candidate.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const pair = place || candidate.match(/(?:@|[?&](?:q|query|ll)=|^)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (!pair) return null;
  const lat = Number(pair[1]);
  const lng = Number(pair[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function summarizeResidences(rows: ResidenceRow[], resolved: Record<string, { lat: number; lng: number }> = {}) {
  const drivers = new Map<string, ResidenceRow>();
  // Rows arrive newest first; use one residence per driver to avoid inflated counts.
  for (const row of rows) {
    const id = row.driver_id.trim().toLowerCase();
    if (id && !drivers.has(id)) drivers.set(id, row);
  }
  const groups = new Map<string, { key: string; city: string; area: string; count: number; position: { lat: number; lng: number } | null }>();
  let missing = 0;
  for (const row of drivers.values()) {
    const city = (row.city || "").trim().replace(/\s+/g, " ");
    const area = (row.area || "").trim().replace(/\s+/g, " ");
    if (!city && !area) { missing++; continue; }
    const key = JSON.stringify([city.toLowerCase(), area.toLowerCase()]);
    const group = groups.get(key) || { key, city, area, count: 0, position: null };
    group.count++;
    const link = (row.google_map || "").trim();
    group.position ||= residenceCoordinates(link) || (link ? resolved[link] ?? null : null);
    groups.set(key, group);
  }
  return { total: drivers.size, missing, groups: [...groups.values()].sort((a, b) => b.count - a.count || a.area.localeCompare(b.area)) };
}

export const residenceAdminAllowed = (role: string | undefined) => role === "admin";