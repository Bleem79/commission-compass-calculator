// Search helpers for the Send SMS dialog: supports pasting multiple
// driver IDs separated by spaces, commas, semicolons or newlines.

export function parseDriverIdTokens(query: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of query.split(/[\s,;]+/)) {
    const token = raw.trim();
    const key = token.toLowerCase();
    if (token && !seen.has(key)) {
      seen.add(key);
      tokens.push(token);
    }
  }
  return tokens;
}

export function filterDriversBySearch<T extends { driver_id: string }>(drivers: T[], query: string): T[] {
  const tokens = parseDriverIdTokens(query);
  if (tokens.length === 0) return drivers;
  const needles = tokens.map((token) => token.toLowerCase());
  return drivers.filter((driver) => {
    const id = driver.driver_id.toLowerCase();
    return needles.some((needle) => id.includes(needle));
  });
}

// Tokens that match no active driver exactly (only meaningful for multi-ID pastes).
export function unmatchedDriverIdTokens(drivers: { driver_id: string }[], query: string): string[] {
  const tokens = parseDriverIdTokens(query);
  if (tokens.length < 2) return [];
  const ids = new Set(drivers.map((driver) => driver.driver_id.toLowerCase()));
  return tokens.filter((token) => !ids.has(token.toLowerCase()));
}
