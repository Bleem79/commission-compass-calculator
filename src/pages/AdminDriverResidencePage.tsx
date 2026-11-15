import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, Home, MapPin, Maximize2, Minimize2, RefreshCw, Search, Users, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DriverResidenceMap from "@/components/map/DriverResidenceMap";
import { ResidenceRow, summarizeResidences, residenceCoordinates, residenceAdminAllowed, excelSafe } from "@/utils/driverResidence";

interface AreaDriver { driver_id: string; driver_name: string | null; nationality: string | null; mobile_no: string | null; status: string | null; hr_status: string | null }

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
  const [fullscreen, setFullscreen] = useState(false);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef<Record<string, { lat: number; lng: number }>>({});
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void mapBoxRef.current?.requestFullscreen?.();
  }, []);
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
  const [areaDrivers, setAreaDrivers] = useState<AreaDriver[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const focusIds = focus?.driverIds.join(",") ?? "";
  useEffect(() => {
    const ids = focusIds ? focusIds.split(",") : [];
    if (!ids.length) { setAreaDrivers([]); return; }
    let cancelled = false;
    setAreaLoading(true);
    (async () => {
      const found = new Map<string, AreaDriver>();
      try {
        for (let i = 0; i < ids.length; i += 200) {
          const { data, error: failure } = await supabase.from("yango_driver_list")
            .select("driver_id, driver_name, nationality, mobile_no, status, hr_status, created_at")
            .in("driver_id", ids.slice(i, i + 200)).order("created_at", { ascending: false });
          if (failure) throw failure;
          for (const r of data || []) { const k = r.driver_id.trim().toLowerCase(); if (!found.has(k)) found.set(k, r); }
        }
      } catch { /* fall back to Driver IDs only */ }
      // Most Yango list rows have no name; fill blanks from the Driver Master File, then Driver Income.
      const missing = ids.filter(id => !found.get(id.toLowerCase())?.driver_name?.trim());
      const names = new Map<string, string>();
      try {
        for (const table of ["driver_master_file", "driver_income"] as const) {
          const need = missing.filter(id => !names.has(id.toLowerCase()));
          for (let i = 0; i < need.length; i += 200) {
            const { data } = await supabase.from(table).select("driver_id, driver_name").in("driver_id", need.slice(i, i + 200)).order("created_at", { ascending: false });
            for (const r of data || []) { const k = r.driver_id.trim().toLowerCase(); const n = r.driver_name?.trim(); if (n && !names.has(k)) names.set(k, n); }
          }
        }
      } catch { /* names stay blank */ }
      for (const id of missing) {
        const k = id.toLowerCase(); const name = names.get(k); if (!name) continue;
        const row = found.get(k);
        found.set(k, row ? { ...row, driver_name: name } : { driver_id: id, driver_name: name, nationality: null, mobile_no: null, status: null, hr_status: null });
      }
      if (cancelled) return;
      setAreaDrivers(ids.map(id => found.get(id.toLowerCase()) ?? { driver_id: id, driver_name: null, nationality: null, mobile_no: null, status: null, hr_status: null })
        .sort((a, b) => a.driver_id.localeCompare(b.driver_id, undefined, { numeric: true })));
      setAreaLoading(false);
    })();
    return () => { cancelled = true; };
  }, [focusIds]);
  const selectArea = useCallback((key: string) => {
    setSelected(key);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, []);
  const exportArea = () => {
    if (!focus) return;
    const sheet = XLSX.utils.json_to_sheet(areaDrivers.map((d, i) => ({
      "No.": i + 1, "Driver ID": excelSafe(d.driver_id), "Driver Name": excelSafe(d.driver_name), Nationality: excelSafe(d.nationality),
      "Mobile No.": excelSafe(d.mobile_no), Status: excelSafe(d.status), "HR Status": excelSafe(d.hr_status), City: excelSafe(focus.city), Area: excelSafe(focus.area),
    })));
    sheet["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 24 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Drivers");
    const name = `${focus.area || focus.city || "area"}`.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");
    XLSX.writeFile(book, `driver-residence-${name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
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
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4"><span className="flex items-center gap-2"><Users className="h-4 w-4" />{count.toLocaleString("en-US")} drivers</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{pins.length} mapped places</span><span>{groups.length - pins.length} places without map coordinates</span>{resolving && <span className="text-muted-foreground">Locating map coordinates…</span>}</div>
      <div ref={mapBoxRef} className={`relative isolate overflow-hidden border border-border mb-5 bg-background ${fullscreen ? "h-full w-full rounded-none" : "h-[360px] sm:h-[480px] rounded-lg"}`}>
        {pins.length ? <DriverResidenceMap groups={groups} selected={selected} onSelect={selectArea} /> : <div className="flex h-full items-center justify-center bg-accent text-accent-foreground px-6 text-center"><div><MapPin className="h-10 w-10 mx-auto mb-3" /><p>No mapped residences available.</p><p className="text-sm mt-2">Upload City, Area and Google Map links containing coordinates in the Yango driver list.</p></div></div>}
        <Button variant="outline" size="icon" aria-label={fullscreen ? "Exit full screen map" : "View map full screen"} title={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen} className="absolute top-3 right-3 z-[1001] h-11 w-11 bg-background shadow-md">
          {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </Button>
      </div>
      {!!(groups.length - pins.length) && <p className="text-sm text-muted-foreground mb-5">Places with blank or shortened map links are counted below but cannot be pinned until coordinates are available.</p>}
      {focus && <div ref={detailRef} className="scroll-mt-4 rounded-lg border border-primary/40 bg-card mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/10 px-4 py-3">
          <div className="min-w-0"><h2 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary shrink-0" /><span className="break-words">{focus.area || focus.city}</span></h2><p className="text-sm text-muted-foreground">{focus.city} · {focus.count} drivers · {count ? (focus.count / count * 100).toFixed(1) : "0.0"}% of filtered residences</p></div>
          <div className="flex gap-2 shrink-0"><Button className="min-h-11" onClick={exportArea} disabled={areaLoading || !areaDrivers.length}><Download className="mr-2 h-4 w-4" />Export Excel</Button><Button variant="outline" className="min-h-11" onClick={() => setSelected(null)}>Close</Button></div>
        </div>
        {areaLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
          <div className="max-h-[420px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-card"><tr className="border-b border-border text-left"><th className="py-2 px-4">#</th><th className="py-2 pr-3">Driver ID</th><th className="py-2 pr-3">Driver Name</th><th className="py-2 pr-3">Nationality</th><th className="py-2 pr-3">Mobile No.</th><th className="py-2 pr-4">HR Status</th></tr></thead>
            <tbody>{areaDrivers.map((d, i) => <tr key={d.driver_id} className="border-b border-border"><td className="py-2 px-4 text-muted-foreground">{i + 1}</td><td className="py-2 pr-3 font-medium">{d.driver_id}</td><td className="py-2 pr-3">{d.driver_name || "—"}</td><td className="py-2 pr-3">{d.nationality || "—"}</td><td className="py-2 pr-3 whitespace-nowrap">{d.mobile_no || "—"}</td><td className="py-2 pr-4">{d.hr_status || "—"}</td></tr>)}</tbody></table></div>}
      </div>}
      <h2 className="text-lg font-semibold mb-3">Residence statistics</h2>
      {groups.length === 0 ? <p className="py-8 text-muted-foreground">No residence records found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="py-3 pr-3">Area / Place</th><th className="py-3 pr-3">City</th><th className="py-3 pr-3">Drivers</th><th className="py-3 pr-3">Share</th><th className="py-3">Drivers list</th></tr></thead><tbody>{groups.slice((page - 1) * 15, page * 15).map(g => <tr key={g.key} className="border-b border-border"><td className="py-3 pr-3 font-medium">{g.area || "Unspecified area"}</td><td className="py-3 pr-3">{g.city || "—"}</td><td className="py-3 pr-3">{g.count}</td><td className="py-3 pr-3">{count ? (g.count / count * 100).toFixed(1) : "0.0"}%</td><td className="py-3"><Button variant="outline" size="icon" aria-label={`Show ${g.area || g.city} on map`} onClick={() => selectArea(g.key)}><MapPin className="h-4 w-4" /></Button></td></tr>)}</tbody></table></div>}
      {pages > 1 && <div className="flex items-center justify-between mt-4 gap-3 text-sm"><span>Page {page} of {pages}</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>}
    </>}
  </PageLayout>;
}