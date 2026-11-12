import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, Eye, FileSignature, Loader2, Printer, Search, Trash2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lazyRetry } from "@/utils/lazyRetry";
import { DECLARATION_ACCEPT, DECLARATION_BUCKET, declarationFileType, summarizeSignatures, validateDeclarationFile, type DeclarationFileType } from "@/utils/trainingDeclaration";
import type { A4DocumentViewerHandle } from "./A4DocumentViewer";
import { formatSignedAt, printSignedDeclaration } from "./printSignedDeclaration";

const A4DocumentViewer = lazyRetry(() => import("./A4DocumentViewer"));

interface DeclarationDoc { id: string; title: string; file_name: string; file_path: string; file_type: DeclarationFileType; video_tutorial_id: string | null; video_tutorial_ids: string[] | null; created_at: string }

/** Linked tutorial videos: new multi-link list first, legacy single link as fallback. */
const docVideoIds = (doc: DeclarationDoc): string[] =>
  doc.video_tutorial_ids?.length ? doc.video_tutorial_ids : doc.video_tutorial_id ? [doc.video_tutorial_id] : [];
interface Ack { id: string; document_id: string | null; document_title: string; driver_id: string; driver_name: string | null; signed_at: string }
interface Group { key: string; title: string; doc: DeclarationDoc | null; acks: Ack[] }

const db = supabase as any;
const NO_VIDEO = "none";
const viewerFallback = <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

const AdminDeclarationsSection = ({ isAdmin, trainedDriverIds, driverNames }: { isAdmin: boolean; trainedDriverIds: string[]; driverNames: Record<string, string | null> }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<A4DocumentViewerHandle>(null);
  const [docs, setDocs] = useState<DeclarationDoc[]>([]);
  const [videos, setVideos] = useState<{ id: string; title: string }[]>([]);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("Acknowledgment and Declaration");
  const [file, setFile] = useState<File | null>(null);
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [videoDialogDoc, setVideoDialogDoc] = useState<DeclarationDoc | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<DeclarationDoc | null>(null);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewAck, setViewAck] = useState<Ack | null>(null);
  const [viewSignature, setViewSignature] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [docsRes, videosRes] = await Promise.all([
      db.from("training_documents").select("id,title,file_name,file_path,file_type,video_tutorial_id,video_tutorial_ids,created_at").order("created_at", { ascending: false }),
      db.from("video_tutorials").select("id,title").order("created_at", { ascending: false }),
    ]);
    let all: Ack[] = [];
    for (let p = 0; ; p++) {
      const { data, error } = await db.from("training_acknowledgments").select("id,document_id,document_title,driver_id,driver_name,signed_at")
        .order("signed_at", { ascending: false }).range(p * 1000, p * 1000 + 999);
      if (error) { toast.error("Could not load signed declarations"); break; }
      all = all.concat(data || []);
      if (!data || data.length < 1000) break;
    }
    setDocs(docsRes.data || []);
    setVideos(videosRes.data || []);
    setAcks(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo<Group[]>(() => {
    const list: Group[] = docs.map((doc) => ({ key: doc.id, title: doc.title, doc, acks: acks.filter((a) => a.document_id === doc.id) }));
    const orphans = new Map<string, Ack[]>();
    acks.filter((a) => !a.document_id || !docs.some((d) => d.id === a.document_id)).forEach((a) => {
      const k = `deleted:${a.document_title}`;
      orphans.set(k, [...(orphans.get(k) || []), a]);
    });
    orphans.forEach((items, key) => list.push({ key, title: items[0].document_title || "Deleted template", doc: null, acks: items }));
    return list;
  }, [docs, acks]);

  const group = groups.find((g) => g.key === groupKey) || null;
  const summary = group ? summarizeSignatures(group.acks, trainedDriverIds) : null;
  const q = search.trim().toLowerCase();
  const signedShown = (group?.acks || []).filter((a) => !q || [a.driver_id, a.driver_name].some((v) => (v || "").toLowerCase().includes(q)));
  const notSignedShown = (summary?.notSigned || []).filter((d) => !q || d.toLowerCase().includes(q) || (driverNames[d] || "").toLowerCase().includes(q));

  const upload = async () => {
    if (!file || !user?.id) return;
    const problem = validateDeclarationFile(file);
    if (problem) return toast.error(problem);
    if (!title.trim()) return toast.error("Please enter a title");
    const type = declarationFileType(file.name)!;
    const path = `templates/${crypto.randomUUID()}.${type}`;
    setUploading(true);
    try {
      const { error: upErr } = await supabase.storage.from(DECLARATION_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error } = await db.from("training_documents").insert({ title: title.trim(), file_name: file.name, file_type: type, file_path: path, video_tutorial_id: videoIds[0] ?? null, video_tutorial_ids: videoIds, uploaded_by: user.id });
      if (error) { await supabase.storage.from(DECLARATION_BUCKET).remove([path]); throw error; }
      toast.success("Template uploaded. Drivers can now read and sign it in My Training.");
      setUploadOpen(false);
      setFile(null);
      setVideoIds([]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (doc: DeclarationDoc) => {
    if (!confirm(`Delete "${doc.title}"? Drivers will no longer see it. Signatures already collected stay saved.`)) return;
    const { error } = await db.from("training_documents").delete().eq("id", doc.id);
    if (error) return toast.error("Delete failed");
    await supabase.storage.from(DECLARATION_BUCKET).remove([doc.file_path]);
    toast.success("Template deleted");
    await load();
  };

  const toggleVideo = async (doc: DeclarationDoc, videoId: string) => {
    const current = docVideoIds(doc);
    const next = current.includes(videoId) ? current.filter((id) => id !== videoId) : [...current, videoId];
    const { error } = await db.from("training_documents").update({ video_tutorial_ids: next, video_tutorial_id: next[0] ?? null }).eq("id", doc.id);
    if (error) return toast.error("Could not update the tutorial links");
    const updated = { ...doc, video_tutorial_ids: next, video_tutorial_id: next[0] ?? null };
    setDocs((ds) => ds.map((d) => (d.id === doc.id ? updated : d)));
    setVideoDialogDoc((d) => (d?.id === doc.id ? updated : d));
  };

  const openAck = async (ack: Ack) => {
    setViewAck(ack);
    setViewSignature(null);
    const { data, error } = await db.from("training_acknowledgments").select("signature_data").eq("id", ack.id).maybeSingle();
    if (error) toast.error("Could not load the signature");
    setViewSignature(data?.signature_data ?? null);
  };

  const deleteAcks = async (ids: string[]) => {
    const removed: string[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await db.from("training_acknowledgments").delete().in("id", ids.slice(i, i + 200)).select("id");
      if (error) break;
      removed.push(...(data || []).map((r: { id: string }) => r.id));
    }
    const gone = new Set(removed);
    if (gone.size) setAcks((as) => as.filter((a) => !gone.has(a.id)));
    return gone.size;
  };

  const removeAck = async (ack: Ack) => {
    if (!confirm(`Delete the signature of ${ack.driver_id}? The driver will need to sign again.`)) return;
    setDeleting(true);
    const count = await deleteAcks([ack.id]);
    setDeleting(false);
    if (!count) return toast.error("Delete failed – only administrators can delete signatures");
    toast.success(`Signature of ${ack.driver_id} deleted`);
    if (viewAck?.id === ack.id) setViewAck(null);
  };

  const removeShownAcks = async () => {
    const ids = signedShown.map((a) => a.id);
    if (!ids.length) return;
    const scope = q ? ` matching "${search.trim()}"` : "";
    if (!confirm(`Delete ${ids.length} signature${ids.length === 1 ? "" : "s"}${scope} for "${group?.title}"? These drivers will need to sign again. This cannot be undone.`)) return;
    setDeleting(true);
    const count = await deleteAcks(ids);
    setDeleting(false);
    if (!count) return toast.error("Delete failed – only administrators can delete signatures");
    if (count < ids.length) toast.warning(`${count} of ${ids.length} signatures deleted. Please try again for the rest.`);
    else toast.success(`${count} signature${count === 1 ? "" : "s"} deleted`);
  };

  const exportExcel = () => {
    if (!group || !summary) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(group.acks.map((a) => ({ "Driver Id": a.driver_id, Name: a.driver_name || "", Declaration: a.document_title, "Agreed (Yes)": "Yes", "Signed At (Dubai)": formatSignedAt(a.signed_at) }))), "Signed");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary.notSigned.map((d) => ({ "Driver Id": d, Name: driverNames[d] || "" }))), "Not Signed");
    XLSX.writeFile(wb, "training-declarations.xlsx");
  };

  const viewDoc = viewAck ? docs.find((d) => d.id === viewAck.document_id) || null : null;

  return (
    <section className="space-y-3 border-b border-border pb-5" aria-labelledby="admin-declaration-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="admin-declaration-heading" className="font-semibold">Acknowledgment and Declaration</h2>
        {isAdmin && <Button className="min-h-11" onClick={() => setUploadOpen(true)}><Upload />Upload Template</Button>}
      </div>
      {loading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> :
        groups.length === 0 ? <p className="text-sm text-muted-foreground">No template uploaded yet. Upload a Word (.docx) or PDF file for drivers to read and sign.</p> : (
        <div className="space-y-3">
          {groups.map((g) => {
            const s = summarizeSignatures(g.acks, trainedDriverIds);
            return (
              <Card key={g.key} className="rounded-lg shadow-none"><CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-md bg-accent p-2.5 text-primary"><FileSignature className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">{g.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {g.doc ? <>{g.doc.file_type === "pdf" ? "PDF" : "Word"} · {g.doc.file_name}</> : "Template deleted – signatures kept"}
                    </p>
                    <p className="mt-1 text-sm"><strong>{g.acks.length}</strong> signed{trainedDriverIds.length > 0 && <> · {s.signed} of {s.total} trained drivers</>}</p>
                  </div>
                </div>
                {g.doc && isAdmin && (
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <Label className="shrink-0 text-xs text-muted-foreground">Tutorial videos for drivers</Label>
                    <Button variant="outline" className="min-h-11 justify-start bg-card sm:max-w-sm" onClick={() => setVideoDialogDoc(g.doc)}>
                      <PlayCircle className="shrink-0" />
                      <span className="truncate">{docVideoIds(g.doc).length ? `${docVideoIds(g.doc).length} video${docVideoIds(g.doc).length === 1 ? "" : "s"} linked` : "No tutorials – tap to choose"}</span>
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {g.doc && <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => setPreview(g.doc)}><Eye />Preview</Button>}
                  <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => { setGroupKey(g.key); setSearch(""); }}><Users />Signatures</Button>
                  {g.doc && isAdmin && <Button variant="ghost" className="min-h-11 text-destructive" onClick={() => removeDoc(g.doc!)}><Trash2 />Delete</Button>}
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }}>
        <DialogContent className="bg-card text-card-foreground">
          <DialogHeader><DialogTitle>Upload declaration template</DialogTitle><DialogDescription>Word (.docx) or PDF, up to 20 MB. Drivers see it as A4 portrait pages in My Training.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="decl-title">Title</Label><Input id="decl-title" className="min-h-11" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <input ref={fileRef} type="file" accept={DECLARATION_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0] || null; const p = f && validateDeclarationFile(f); if (p) { toast.error(p); setFile(null); } else setFile(f); if (fileRef.current) fileRef.current.value = ""; }} />
              <Button type="button" variant="outline" className="min-h-11 w-full justify-start" onClick={() => fileRef.current?.click()}><Upload /><span className="truncate">{file ? file.name : "Choose Word or PDF file"}</span></Button>
            </div>
            <div className="space-y-1.5">
              <Label>Tutorial videos (optional – choose one or more)</Label>
              {videos.length === 0 ? <p className="text-sm text-muted-foreground">No tutorials yet. Add them on the Video Tutorials page first.</p> : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {videos.map((v) => (
                    <label key={v.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted">
                      <Checkbox className="h-5 w-5" checked={videoIds.includes(v.id)} onCheckedChange={(c) => setVideoIds((ids) => (c === true ? [...ids, v.id] : ids.filter((id) => id !== v.id)))} />
                      <span className="text-sm">{v.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="min-h-11" disabled={uploading} onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button className="min-h-11" disabled={uploading || !file} onClick={upload}>{uploading ? <Loader2 className="animate-spin" /> : <Upload />}Upload</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto bg-card p-3 text-card-foreground sm:p-6">
          <DialogHeader><DialogTitle className="pr-8">{preview?.title}</DialogTitle><DialogDescription>A4 portrait preview, as drivers will see it.</DialogDescription></DialogHeader>
          <div className="rounded-md bg-muted p-2 sm:p-4">{preview && <Suspense fallback={viewerFallback}><A4DocumentViewer filePath={preview.file_path} fileType={preview.file_type} /></Suspense>}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!group} onOpenChange={(o) => !o && setGroupKey(null)}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto bg-card text-card-foreground">
          <DialogHeader><DialogTitle className="pr-8">Signatures – {group?.title}</DialogTitle><DialogDescription>{group?.acks.length ?? 0} signed{summary && summary.total > 0 ? ` · ${summary.notSigned.length} trained drivers not signed yet` : ""}</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search signatures" className="min-h-11 pl-10" placeholder="Search Driver ID or name..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Button variant="outline" className="min-h-11" onClick={exportExcel}><Download />Export Excel</Button>
          </div>
          <Tabs defaultValue="signed">
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signed">Signed ({group?.acks.length ?? 0})</TabsTrigger><TabsTrigger value="not">Not signed ({summary?.notSigned.length ?? 0})</TabsTrigger></TabsList>
            <TabsContent value="signed" className="max-h-[50dvh] space-y-1 overflow-y-auto">
              {isAdmin && signedShown.length > 0 && (
                <div className="flex justify-end pb-1">
                  <Button variant="outline" className="min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={removeShownAcks}>
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}Delete {q ? `${signedShown.length} shown` : `all ${signedShown.length}`} signature{signedShown.length === 1 ? "" : "s"}
                  </Button>
                </div>
              )}
              {signedShown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No signatures found</p> : signedShown.map((a) => (
                <div key={a.id} className="flex items-center gap-1 border-b border-border">
                  <button type="button" onClick={() => openAck(a)} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 px-1 py-2 text-left text-sm hover:bg-muted">
                    <span className="min-w-0"><span className="font-semibold">{a.driver_id}</span>{a.driver_name && <span className="block truncate text-muted-foreground">{a.driver_name}</span>}</span>
                    <span className="shrink-0 text-right text-xs text-muted-foreground">{formatSignedAt(a.signed_at)}</span>
                  </button>
                  {isAdmin && <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-destructive" disabled={deleting} aria-label={`Delete signature of ${a.driver_id}`} title="Delete signature" onClick={() => removeAck(a)}><Trash2 /></Button>}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="not" className="max-h-[50dvh] space-y-1 overflow-y-auto">
              {notSignedShown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Everyone in the training register has signed</p> : notSignedShown.map((d) => (
                <div key={d} className="flex min-h-11 items-center gap-3 border-b border-border px-1 py-2 text-sm"><span className="font-semibold">{d}</span><span className="truncate text-muted-foreground">{driverNames[d] || ""}</span></div>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewAck} onOpenChange={(o) => !o && setViewAck(null)}>
        <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto bg-card p-3 text-card-foreground sm:p-6">
          <DialogHeader><DialogTitle className="pr-8">Signed declaration – {viewAck?.driver_id}</DialogTitle><DialogDescription>{viewAck?.document_title}</DialogDescription></DialogHeader>
          <div className="grid gap-1 rounded-md border border-border p-3 text-sm">
            <div><span className="text-muted-foreground">Driver:</span> <strong>{viewAck?.driver_id}</strong>{viewAck?.driver_name && <> · {viewAck.driver_name}</>}</div>
            <div><span className="text-muted-foreground">Agreed:</span> <strong>Yes</strong></div>
            <div><span className="text-muted-foreground">Signed:</span> {viewAck && formatSignedAt(viewAck.signed_at)}</div>
            {viewSignature ? <img src={viewSignature} alt="Driver signature" className="mt-2 max-h-44 w-full rounded-md border border-border bg-background object-contain" /> : <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isAdmin && viewAck && <Button variant="ghost" className="min-h-11 text-destructive" disabled={deleting} onClick={() => removeAck(viewAck)}><Trash2 />Delete signature</Button>}
            <Button className="min-h-11" disabled={!viewSignature} onClick={() => viewAck && viewSignature && !printSignedDeclaration(viewerRef.current?.content() ?? null, { title: viewAck.document_title, driverId: viewAck.driver_id, driverName: viewAck.driver_name, signedAt: viewAck.signed_at, signature: viewSignature }) && toast.error("Allow pop-ups to print the signed copy")}><Printer />Print / Save PDF</Button>
          </div>
          {viewDoc && <div className="rounded-md bg-muted p-2 sm:p-4"><Suspense fallback={viewerFallback}><A4DocumentViewer ref={viewerRef} filePath={viewDoc.file_path} fileType={viewDoc.file_type} /></Suspense></div>}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AdminDeclarationsSection;
