export interface ParkingInput { parking_name: string; area_name: string; latitude: number; longitude: number }
export interface ParkingRecord extends ParkingInput { id: string; created_at: string; updated_at: string }
export interface ParkingPreview { row: number; record?: ParkingInput; error?: string; duplicate: boolean }

export function validateParking(record: ParkingInput): string | null {
  if (!record.parking_name.trim() || record.parking_name.trim().length > 200) return 'Parking name must contain 1 to 200 characters.';
  if (!record.area_name.trim() || record.area_name.trim().length > 200) return 'Area name must contain 1 to 200 characters.';
  if (!Number.isFinite(record.latitude) || record.latitude < -90 || record.latitude > 90) return 'Latitude must be a number between -90 and 90.';
  if (!Number.isFinite(record.longitude) || record.longitude < -180 || record.longitude > 180) return 'Longitude must be a number between -180 and 180.';
  return null;
}
export const parkingKey = (p: ParkingInput) => JSON.stringify([p.parking_name.trim().toLowerCase(), p.area_name.trim().toLowerCase(), p.latitude, p.longitude]);
export function previewParking(sheet: unknown[][], existing: ParkingInput[]): ParkingPreview[] {
  const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  const headerRow = sheet.findIndex(row => row.some(value => ['nameofparking', 'parkingname', 'name'].includes(normalize(value))));
  if (headerRow < 0) throw new Error('Missing required columns: Name of Parking, Area Name, Coordinates.');
  const headers = sheet[headerRow].map(normalize);
  const nameIndex = headers.findIndex(h => ['nameofparking', 'parkingname', 'name'].includes(h));
  const areaIndex = headers.findIndex(h => ['areaname', 'area', 'district', 'neighborhood'].includes(h));
  const coordinateIndex = headers.findIndex(h => ['coordinates', 'coordinate', 'latitudelongitude', 'latlong', 'latlng'].includes(h));
  if (areaIndex < 0 || coordinateIndex < 0) throw new Error('Required columns: Name of Parking, Area Name, Coordinates (latitude, longitude).');
  const seen = new Set(existing.map(parkingKey));
  return sheet.slice(headerRow + 1).flatMap<ParkingPreview>((cells, index) => {
    if (cells.every(cell => String(cell ?? '').trim() === '')) return [];
    const row = headerRow + index + 2;
    const coordinates = String(cells[coordinateIndex] ?? '').split(',').map(v => v.trim());
    if (coordinates.length !== 2 || coordinates.some(v => !v || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v))) return [{ row, error: 'Coordinates must contain two numeric values: latitude, longitude.', duplicate: false }];
    const record = { parking_name: String(cells[nameIndex] ?? '').trim(), area_name: String(cells[areaIndex] ?? '').trim(), latitude: Number(coordinates[0]), longitude: Number(coordinates[1]) };
    const error = validateParking(record);
    if (error) return [{ row, error, duplicate: false }];
    const key = parkingKey(record);
    const duplicate = seen.has(key);
    seen.add(key);
    return [{ row, record, duplicate }];
  });
}
export function directionsUrl(destination: Pick<ParkingInput, 'latitude' | 'longitude'>, origin?: { latitude: number; longitude: number }): string {
  const params = new URLSearchParams({ api: '1', destination: `${destination.latitude},${destination.longitude}`, travelmode: 'driving' });
  if (origin) params.set('origin', `${origin.latitude},${origin.longitude}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
export function searchParking(records: ParkingRecord[], search: string, area: string) {
  const text = search.trim().toLowerCase();
  return records.filter(p => (!area || p.area_name === area) && `${p.parking_name} ${p.area_name}`.toLowerCase().includes(text));
}