import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { MapPin, Plus, Upload, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/shared/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { directionsUrl, previewParking, searchParking, validateParking, type ParkingRecord, type ParkingPreview } from '@/utils/safeParking';
import LeafletMap from '@/components/map/LeafletMap';
import LocationCard from '@/components/map/LocationCard';

const blank = { parking_name: '', area_name: '', latitude: '', longitude: '' };
const errorText = (error: unknown) => error instanceof Error ? error.message : String((error as { message?: string })?.message ?? 'Please try again.');

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function SafeParkingPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<ParkingRecord | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<ParkingRecord | null>(null);
  const [preview, setPreview] = useState<ParkingPreview[] | null>(null);
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [busyDirections, setBusyDirections] = useState<string | null>(null);
  const [navigation, setNavigation] = useState<{ id: string; url: string; message: string } | null>(null);
  const [routes, setRoutes] = useState<Record<string, { distanceMeters: number; durationSeconds: number }>>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: ['safe-parking'],
    queryFn: async () => {
      const rows: ParkingRecord[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('safe_parking').select('*').order('parking_name').order('id').range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['safe-parking'] });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLoadingLocation(false);
      },
      () => {
        setLocationError("Unable to get your location");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);
  const filtered = searchParking(records, search, area === 'all' ? '' : area);
  const filteredWithDistance = useMemo(
    () => searchParking(records, search, area === 'all' ? '' : area)
      .map(record => ({ ...record, distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, record.latitude, record.longitude) : null }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)),
    [records, search, area, userLocation]
  );
  const markers = useMemo(() => filteredWithDistance.map((record, index) => ({ id: index + 1, name: `${record.parking_name} — ${record.area_name}`, lat: record.latitude, lng: record.longitude, url: record.id, distance: record.distance })), [filteredWithDistance]);
  const mapCenter = useMemo(() => userLocation || (filteredWithDistance.length ? { lat: filteredWithDistance.reduce((sum, r) => sum + r.latitude, 0) / filteredWithDistance.length, lng: filteredWithDistance.reduce((sum, r) => sum + r.longitude, 0) / filteredWithDistance.length } : { lat: 25.346, lng: 55.42 }), [userLocation, filteredWithDistance]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 15));
  const currentPage = Math.min(page, totalPages);
  const displayed = filteredWithDistance.slice((currentPage - 1) * 15, currentPage * 15);
  const valid = preview?.filter(row => row.record && !row.error && !row.duplicate) ?? [];
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const openMarkerDirections = useCallback((id: string) => {
    const record = recordsRef.current.find(r => r.id === id);
    if (record) getDirections(record);
  }, []);

  function edit(record?: ParkingRecord) {
    setEditor(record ?? 'new');
    setForm(record ? { parking_name: record.parking_name, area_name: record.area_name, latitude: String(record.latitude), longitude: String(record.longitude) } : blank);
    setFormError('');
  }
  async function save() {
    if (!isAdmin || !editor) return;
    const input = { parking_name: form.parking_name.trim(), area_name: form.area_name.trim(), latitude: form.latitude.trim() ? Number(form.latitude) : NaN, longitude: form.longitude.trim() ? Number(form.longitude) : NaN };
    const validation = validateParking(input);
    if (validation) { setFormError(validation); return; }
    setSaving(true);
    try {
      const result = editor === 'new' ? await supabase.from('safe_parking').insert(input) : await supabase.from('safe_parking').update(input).eq('id', editor.id).select('id').single();
      if (result.error) throw result.error;
      toast.success(editor === 'new' ? 'Parking added.' : 'Parking updated.');
      setEditor(null); await refresh();
    } catch (error) { setFormError((error as { code?: string }).code === '23505' ? 'This parking name, area and coordinates already exist.' : errorText(error)); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!isAdmin || !deleting) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('safe_parking').delete().eq('id', deleting.id).select('id').single();
      if (error) throw error;
      toast.success('Parking deleted.'); setDeleting(null); await refresh();
    } catch (error) { toast.error(errorText(error)); } finally { setSaving(false); }
  }
  async function readFile(file?: File) {
    if (!file || !isAdmin) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) { toast.error('Choose an Excel file (.xlsx or .xls).'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Choose a file smaller than 10 MB.'); return; }
    setReading(true);
    try {
      const latest = await refetch();
      if (latest.error) throw latest.error;
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('The workbook has no worksheet.');
      const rows = previewParking(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }), latest.data ?? []);
      if (!rows.length) throw new Error('The worksheet contains no parking records.');
      if (rows.length > 5000) throw new Error('Import up to 5,000 records per file.');
      setFileName(file.name); setPreview(rows);
    } catch (error) { toast.error(errorText(error)); } finally { setReading(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  async function importRows() {
    if (!isAdmin || !valid.length) return;
    setSaving(true);
    try {
      const p_rows = valid.flatMap(row => row.record ? [{ parking_name: row.record.parking_name, area_name: row.record.area_name, latitude: row.record.latitude, longitude: row.record.longitude }] : []);
      const { data, error } = await supabase.rpc('import_safe_parking', { p_rows });
      if (error) throw error;
      const summary = data as { saved: number; skipped: number };
      toast.success(`Import complete: ${summary.saved} saved, ${summary.skipped + (preview?.filter(r => r.duplicate).length ?? 0)} duplicates skipped, ${preview?.filter(r => r.error).length ?? 0} invalid rows not imported.`);
      setPreview(null); await refresh();
    } catch (error) { toast.error(`Import cancelled; no records saved. ${errorText(error)}`); } finally { setSaving(false); }
  }
  async function getDirections(record: ParkingRecord) {
    setBusyDirections(record.id); setNavigation(null);
    // Open on the click gesture so mobile browsers do not block the eventual navigation.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    let url = directionsUrl(record);
    try {
      if (!navigator.geolocation) throw new Error('Current location is unavailable in this browser. Set your starting point in Google Maps.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
      const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      url = directionsUrl(record, origin);
      if (tab) tab.location.replace(url);
      setNavigation({ id: record.id, url, message: tab ? 'Driving directions opened in Google Maps.' : 'Tap Open Google Maps to continue.' });
      const { data, error } = await supabase.functions.invoke('safe-parking-route', { body: { parkingId: record.id, origin } });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        let message = 'Distance and time unavailable; continue in Google Maps.';
        try { message = JSON.parse(details).error || message; } catch { /* keep readable fallback */ }
        setNavigation({ id: record.id, url, message });
      } else if (data && Number.isFinite(data.distanceMeters) && Number.isFinite(data.durationSeconds)) setRoutes(old => ({ ...old, [record.id]: data }));
    } catch (error) {
      const code = (error as GeolocationPositionError).code;
      const message = code === 1 ? 'Location permission was denied. Set your starting point in Google Maps.' : code === 3 ? 'Your location request timed out. Set your starting point in Google Maps.' : code === 2 ? 'Your current location could not be found. Set your starting point in Google Maps.' : errorText(error);
      if (tab) tab.close();
      setNavigation({ id: record.id, url, message });
    } finally { setBusyDirections(null); }
  }
  const adminActions = (record: ParkingRecord) => isAdmin ? <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-11 w-11" aria-label={`Edit ${record.parking_name}`} title="Edit parking" onClick={() => edit(record)}><Pencil /></Button><Button variant="destructive" size="icon" className="h-11 w-11" aria-label={`Delete ${record.parking_name}`} title="Delete parking" onClick={() => setDeleting(record)}><Trash2 /></Button></div> : null;
  const routeText = (record: ParkingRecord) => routes[record.id] ? <p className="text-sm text-primary mt-2">{(routes[record.id].distanceMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km · {Math.ceil(routes[record.id].durationSeconds / 60)} min driving</p> : null;

  return <PageLayout title="Safe Parking" icon={<MapPin className="h-6 w-6" />} maxWidth="6xl" gradient="from-background via-muted to-muted/50" headerActions={isAdmin ? <><input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => readFile(e.target.files?.[0])} /><Button variant="outline" className="min-h-11" disabled={reading || isLoading || !!error} onClick={() => fileRef.current?.click()}>{reading ? <Loader2 className="animate-spin" /> : <Upload />}Import Excel</Button><Button className="min-h-11" onClick={() => edit()}><Plus />Add Parking</Button></> : undefined}>
    <p className="text-muted-foreground mb-4">Find designated safe parking locations and navigate to them.</p>
    <div className="flex items-center gap-2 text-sm mb-4">
      {isLoadingLocation ? (
        <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Getting your location...</span>
      ) : userLocation ? (
        <span className="flex items-center gap-2 text-green-600 dark:text-green-400"><MapPin className="h-4 w-4" />Location detected - showing distances</span>
      ) : locationError ? (
        <span className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{locationError}</span>
      ) : null}
    </div>
    <div className="flex flex-col sm:flex-row gap-3 mb-5"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input className="pl-10 h-11" aria-label="Search parking name or area" placeholder="Search parking name or area" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div><Select value={area} onValueChange={value => { setArea(value); setPage(1); }}><SelectTrigger className="sm:w-56 h-11" aria-label="Filter by area"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All areas</SelectItem>{Array.from(new Set(records.map(r => r.area_name))).sort().map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
    {navigation && <div role="status" className="border border-border bg-muted p-4 rounded-lg mb-4"><p className="text-sm mb-3">{navigation.message}</p><Button asChild variant="outline" className="min-h-11"><a href={navigation.url} target="_blank" rel="noopener noreferrer"><Navigation />Open Google Maps</a></Button></div>}
    {isLoading ? <div role="status" className="py-12 flex justify-center gap-2"><Loader2 className="animate-spin" />Loading parking locations…</div> : error ? <div role="alert" className="py-8"><p className="text-destructive mb-3">Could not load parking: {errorText(error)}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div> : !filtered.length ? <div className="text-center py-14 border-y border-border"><MapPin className="mx-auto h-9 w-9 text-muted-foreground mb-3" /><p className="font-semibold">{records.length ? 'No matching parking locations' : 'No safe parking locations yet'}</p></div> : <>
    <p className="text-sm text-muted-foreground mb-3">{filtered.length} locations</p>
    <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden border-2 border-border mb-6 relative">
      <LeafletMap center={mapCenter} zoom={13} markers={markers} onMarkerClick={openMarkerDirections} userLocation={userLocation} />
    </div>
    <h2 className="text-xl font-semibold text-foreground mb-4">Safe Parking Directory</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {displayed.map(record => (
        <LocationCard
          key={record.id}
          id={filteredWithDistance.findIndex(r => r.id === record.id) + 1}
          name={record.parking_name}
          subtitle={record.area_name}
          url={record.id}
          distance={record.distance}
          actions={<div className="mt-3">{routeText(record)}{adminActions(record)}</div>}
          onOpenLocation={openMarkerDirections}
        />
      ))}
    </div>
    <div className="flex items-center justify-between gap-2 mt-5"><Button variant="outline" className="min-h-11" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><span className="text-sm">{currentPage} / {totalPages}</span><Button variant="outline" className="min-h-11" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></>}
    {isAdmin && <>
    <Dialog open={editor !== null} onOpenChange={open => { if (!open && !saving) setEditor(null); }}><DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editor === 'new' ? 'Add Parking' : 'Edit Parking'}</DialogTitle><DialogDescription>Parking location details</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); save(); }}>{(['parking_name', 'area_name', 'latitude', 'longitude'] as const).map(key => <div key={key}><Label htmlFor={key}>{({ parking_name: 'Parking Name', area_name: 'Area Name', latitude: 'Latitude', longitude: 'Longitude' })[key]}</Label><Input id={key} className="h-11 mt-1" required maxLength={key.includes('name') ? 200 : undefined} inputMode={key.includes('name') ? 'text' : 'decimal'} value={form[key]} onChange={e => setForm(old => ({ ...old, [key]: e.target.value }))} /></div>)}{formError && <p role="alert" className="text-destructive text-sm">{formError}</p>}<div className="flex justify-end gap-2"><Button type="button" className="min-h-11" variant="outline" disabled={saving} onClick={() => setEditor(null)}>Cancel</Button><Button className="min-h-11" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save Parking</Button></div></form></DialogContent></Dialog>
    <Dialog open={deleting !== null} onOpenChange={open => { if (!open && !saving) setDeleting(null); }}><DialogContent className="w-[calc(100%-2rem)]"><DialogHeader><DialogTitle>Delete parking?</DialogTitle><DialogDescription>Delete {deleting?.parking_name}? This cannot be undone.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" className="min-h-11" disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" className="min-h-11" disabled={saving} onClick={remove}>Delete</Button></div></DialogContent></Dialog>
    <Dialog open={preview !== null} onOpenChange={open => { if (!open && !saving) setPreview(null); }}><DialogContent className="w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Import preview</DialogTitle><DialogDescription>{fileName} — only valid, nonduplicate rows will be saved. Existing records are never overwritten.</DialogDescription></DialogHeader><p className="text-sm">{valid.length} ready to import · {preview?.filter(r => r.error).length ?? 0} invalid · {preview?.filter(r => r.duplicate).length ?? 0} duplicates</p><div className="max-h-[45dvh] overflow-auto border border-border rounded-lg">{preview?.map(row => <div key={row.row} className="border-b border-border p-3 text-sm"><span className="font-semibold">Row {row.row}: </span>{row.error ? <span className="text-destructive">{row.error}</span> : <><span className="break-words">{row.record?.parking_name} · {row.record?.area_name} · {row.record?.latitude}, {row.record?.longitude}</span><p className="text-muted-foreground">{row.duplicate ? 'Duplicate — skipped' : 'Valid'}</p></>}</div>)}</div><div className="flex justify-end gap-2"><Button variant="outline" className="min-h-11" disabled={saving} onClick={() => setPreview(null)}>Cancel</Button><Button className="min-h-11" disabled={saving || !valid.length} onClick={importRows}>{saving && <Loader2 className="animate-spin" />}Confirm Import ({valid.length})</Button></div></DialogContent></Dialog>
    </>}
  </PageLayout>;
}