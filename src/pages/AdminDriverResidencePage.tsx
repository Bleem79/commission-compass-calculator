import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Home, MapPin, RefreshCw, Search, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DriverResidenceMap from "@/components/map/DriverResidenceMap";
import { ResidenceRow, summarizeResidences, residenceCoordinates, residenceAdminAllowed } from "@/utils/driverResidence";

export default function AdminDriverResidencePage() {
  const { user } = useAuth();
  const allowed = residenceAdminAllowed(user?.role);
  const [rows, setRows] = useState<ResidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [city, setCity] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [resolved, setResolved] = useState<Record<string, { lat: number; lng: number }>>({});
  const [resolving, setResolving] = useState(false);
  const resolvedRef = useRef<Record<string, { lat: number; lng: number }>>({});
  const resolveLinks = useCallback(async (all: ResidenceRow[]) => {
    const pending = [...new Set(all
      .map(row => (row.google_map || "").trim())
      .filter(link => link && /^https?:\/\//i.test(link) && !residenceCoordinates(link) && !(link in resolvedRef.current)))];
    if (!pending.length) return;
    setResolving(true);
    const merged = { ...resolvedRef.current };
    try {
      for (let i = 0; i < pending.length; i += 50) {
        const { data, error } = await supabase.functions.invoke("resolve-residence-links", { body: { urls: pending.slice(i, i + 50) } });
        if (error) throw error;
        Object.assign(merged, (data as { results?: Record<string, { lat: number; lng: number } | null> })?.results ?? {});
      }
    } catch { /* short links that cannot be resolved stay unmapped */ }
    resolvedRef.current = merged;
    setResolved(merged);
    setResolving(false);
  }, []);
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true); setError("");
    try {
      const all: ResidenceRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error: failure } = await supabase.rpc("get_driver_residence_rows", { p_offset: offset });
        if (failure) throw failure;
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      setRows(all);
      void resolveLinks(all);
    } catch { setError("Unable to load driver residences. Please try again."); }
    finally { setLoading(false); }
  }, [allowed, resolveLinks]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); setSelected(null); }, [city, search]);
  const summary = useMemo(() => summarizeResidences(rows, resolved), [rows, resolved]);
  const cities = useMemo(() => [...new Set(summary.groups.map(g => g.city).filter(Boolean))].sort(), [summary]);
  const groups = useMemo(() => summary.groups.filter(g => (city === "all" || g.city === city) && `${g.city} ${g.area}`.toLowerCase().includes(search.trim().toLowerCase())), [summary, city, search]);
  const pins = groups.filter(g => g.position);
  const count = groups.reduce((sum, g) => sum + g.count, 0);
  const focus = groups.find(g => g.key === selected);
  const pages = Math.max(1, Math.ceil(groups.length / 15));
  if (!allowed) return <Navigate to="/home" replace />;
  return <PageLayout title="Driver Residence" icon={<Home className="h-6 w-6" />} gradient="from-background to-background" headerActions={<Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>}>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : error ? <p role="alert" className="text-destructive py-8">{error}</p> : <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-border py-5 mb-6">
        {[["Drivers in list", summary.total], ["Drivers with residence", summary.total - summary.missing], ["Missing residence", summary.missing], ["Areas / places", summary.groups.length]].map(([label, value]) => <div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground mt-1">{Number(value).toLocaleString("en-US")}</p></div>)}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search city or area" placeholder="Search city or area" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={city} onValueChange={setCity}><SelectTrigger className="sm:w-56" aria-label="City"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All cities</SelectItem>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4"><span className="flex items-center gap-2"><Users className="h-4 w-4" />{count.toLocaleString("en-US")} drivers</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{pins.length} mapped places</span><span>{groups.length - pins.length} places without map coordinates</span></div>
      <div className="relative isolate h-[360px] sm:h-[480px] overflow-hidden rounded-lg border border-border mb-5">
        {pins.length ? <DriverResidenceMap groups={groups} selected={selected} onSelect={setSelected} /> : <div className="flex h-full items-center justify-center bg-accent text-accent-foreground px-6 text-center"><div><MapPin className="h-10 w-10 mx-auto mb-3" /><p>No mapped residences available.</p><p className="text-sm mt-2">Upload City, Area and Google Map links containing coordinates in the Yango driver list.</p></div></div>}
      </div>
      {!!(groups.length - pins.length) && <p className="text-sm text-muted-foreground mb-5">Places with blank or shortened map links are counted below but cannot be pinned until coordinates are available.</p>}
      {focus && <div className="border-y border-border py-4 mb-5 flex items-center justify-between gap-3"><div><h2 className="font-semibold">{focus.area || focus.city}</h2><p className="text-sm text-muted-foreground">{focus.city} · {focus.count} drivers · {count ? (focus.count / count * 100).toFixed(1) : "0.0"}% of filtered residences</p></div><Button variant="ghost" onClick={() => setSelected(null)}>Clear selection</Button></div>}
      <h2 className="text-lg font-semibold mb-3">Residence statistics</h2>
      {groups.length === 0 ? <p className="py-8 text-muted-foreground">No residence records found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="py-3 pr-3">Area / Place</th><th className="py-3 pr-3">City</th><th className="py-3 pr-3">Drivers</th><th className="py-3 pr-3">Share</th><th className="py-3">Map</th></tr></thead><tbody>{groups.slice((page - 1) * 15, page * 15).map(g => <tr key={g.key} className="border-b border-border"><td className="py-3 pr-3 font-medium">{g.area || "Unspecified area"}</td><td className="py-3 pr-3">{g.city || "—"}</td><td className="py-3 pr-3">{g.count}</td><td className="py-3 pr-3">{count ? (g.count / count * 100).toFixed(1) : "0.0"}%</td><td className="py-3"><Button variant="outline" size="icon" aria-label={`Show ${g.area || g.city} on map`} disabled={!g.position} onClick={() => setSelected(g.key)}><MapPin className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>}
      {pages > 1 && <div className="flex items-center justify-between mt-4 gap-3 text-sm"><span>Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>}
    </>}
  </PageLayout>;
}