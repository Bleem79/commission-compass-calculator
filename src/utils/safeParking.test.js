import { describe, expect, test } from 'bun:test';
import { directionsUrl, previewParking, validateParking, searchParking } from './safeParking';
const parking = { parking_name: 'Safe Parking A', area_name: 'Al Majaz', latitude: 25.3, longitude: 55.4 };
describe('Safe Parking', () => {
  test('imports required Excel columns despite capitalization and spacing', () => {
    expect(previewParking([[' Name OF Parking ', 'AREA NAME', ' Coordinates '], ['Safe Parking A', 'Al Majaz', '25.3, 55.4']], [])[0].record).toEqual(parking);
  });
  test('rejects missing required columns', () => expect(() => previewParking([['Name of Parking'], ['A']], [])).toThrow('Required columns'));
  test('rejects nonnumeric coordinates with a row number', () => expect(previewParking([['Name of Parking', 'Area Name', 'Coordinates'], ['A', 'B', '25.XXXX,55.XXXX']], [])[0]).toMatchObject({ row: 2, duplicate: false, error: 'Coordinates must contain two numeric values: latitude, longitude.' }));
  test('valid latitude range is -90 through 90', () => { expect(validateParking({ ...parking, latitude: 90 })).toBeNull(); expect(validateParking({ ...parking, latitude: 90.01 })).toContain('Latitude'); expect(validateParking({ ...parking, latitude: -90.01 })).toContain('Latitude'); });
  test('valid longitude range is -180 through 180', () => { expect(validateParking({ ...parking, longitude: -180 })).toBeNull(); expect(validateParking({ ...parking, longitude: 180.01 })).toContain('Longitude'); });
  test('flags duplicates within file and existing records without overwriting them', () => {
    const sheet = [['Name of Parking', 'Area Name', 'Coordinates'], ['safe parking a', 'AL MAJAZ', '25.3,55.4'], ['New', 'Area', '1,2'], ['New', 'Area', '1,2']];
    expect(previewParking(sheet, [parking]).map(r => r.duplicate)).toEqual([true, false, true]); expect(parking.parking_name).toBe('Safe Parking A');
  });
  test('driving directions use actual origin and selected destination', () => { const url = new URL(directionsUrl(parking, { latitude: 24.8, longitude: 54.9 })); expect(url.searchParams.get('origin')).toBe('24.8,54.9'); expect(url.searchParams.get('destination')).toBe('25.3,55.4'); expect(url.searchParams.get('travelmode')).toBe('driving'); });
  test('destination-only fallback has no fabricated origin', () => expect(new URL(directionsUrl(parking)).searchParams.has('origin')).toBe(false));
  test('search matches parking and area names', () => { const records = [{ ...parking, id: '1' }]; expect(searchParking(records, 'majaz', '')).toHaveLength(1); expect(searchParking(records, 'PARKING A', '')).toHaveLength(1); expect(searchParking(records, 'khan', '')).toHaveLength(0); });
});