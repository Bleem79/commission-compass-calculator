import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, FileSignature, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lazyRetry } from "@/utils/lazyRetry";
import { canSubmitDeclaration, type DeclarationFileType } from "@/utils/trainingDeclaration";
import SignaturePad from "./SignaturePad";
import TrainingVideoPlayer, { openTrainingVideo, type TrainingVideo } from "./TrainingVideoPlayer";
import { formatSignedAt } from "./printSignedDeclaration";

const A4DocumentViewer = lazyRetry(() => import("./A4DocumentViewer"));

interface DeclarationDoc { id: string; title: string; file_path: string; file_type: DeclarationFileType; video_tutorial_id: string | null; video_tutorial_ids: string[] | null; created_at: string }
interface MyAck { id: string; document_id: string | null; signed_at: string; signature_data?: string | null }

const db = supabase as any;

/** Linked tutorial videos: new multi-link list first, legacy single link as fallback. */
const docVideoIds = (doc: DeclarationDoc): string[] =>
  doc.video_tutorial_ids?.length ? doc.video_tutorial_ids : doc.video_tutorial_id ? [doc.video_tutorial_id] : [];

interface CardProps {
  doc: DeclarationDoc;
  ack?: MyAck;
  videos: TrainingVideo[];
  driverId: string;
  driverName: string | null;
  onRead: () => void;
  onWatch: (video: TrainingVideo) => void;
  onSigned: (ack: MyAck) => void;
}

/** One declaration card: tick Yes, sign right below, and submit on the same card. */
const DeclarationCard = ({ doc, ack, videos, driverId, driverName, onRead, onWatch, onSigned }: CardProps) => {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!canSubmitDeclaration({ agreed, signature })) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again");
      const { data, error } = await db.from("training_acknowledgments")
        .insert({ document_id: doc.id, user_id: user.id, driver_id: driverId, driver_name: driverName, agreed: true, signature_data: signature })
        .select("id,document_id,signed_at").single();
      if (error) throw error;
      onSigned({ ...data, signature_data: signature });
      toast.success("Thank you. Your signed declaration has been saved.");
    } catch (e: any) {
      toast.error(e?.code === "23505" ? "You have already signed this declaration." : e?.message || "Could not save your signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-lg shadow-none"><CardContent className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-md bg-accent p-2.5 text-primary"><FileSignature className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold">{doc.title}</h3>
          {ack
            ? <p className="mt-1 flex items-center gap-1.5 text-sm text-primary"><CheckCircle2 className="h-4 w-4" />Signed {formatSignedAt(ack.signed_at)}</p>
            : <p className="mt-1 text-sm text-destructive">Please read, tick Yes and sign below.</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button className="min-h-11 w-full justify-start" variant="outline" onClick={onRead}><BookOpen />Read declaration</Button>
        {videos.map((v) => <Button key={v.id} variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => onWatch(v)}><PlayCircle className="shrink-0" /><span className="min-w-0 break-words">Watch tutorial: {v.title}</span></Button>)}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="break-words text-sm"><span className="text-muted-foreground">Driver ID:</span> <strong>{driverId}</strong>{driverName && <> · {driverName}</>}</div>
        {ack ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="h-5 w-5" />Yes – I agree</p>
            {ack.signature_data && <img src={ack.signature_data} alt="Your signature" className="max-h-44 w-full rounded-md border border-border bg-background object-contain" />}
          </div>
        ) : (
          <>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <Checkbox className="mt-0.5 h-6 w-6" checked={agreed} onCheckedChange={(v) => { setAgreed(v === true); if (v !== true) setSignature(null); }} disabled={saving} />
              <span className="min-w-0 text-sm leading-relaxed"><strong>Yes</strong> – I have read and understood this Acknowledgment and Declaration, and I agree to follow it.</span>
            </label>
            {agreed && (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-sm font-medium">Your signature</p>
                  <SignaturePad onChange={setSignature} disabled={saving} />
                </div>
                <Button className="min-h-11 w-full" disabled={saving || !canSubmitDeclaration({ agreed, signature })} onClick={submit}>
                  {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Submit signed declaration
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </CardContent></Card>
  );
};

const DriverDeclarationsSection = ({ driverId, driverName }: { driverId: string; driverName: string | null }) => {
  const [docs, setDocs] = useState<DeclarationDoc[]>([]);
  const [videos, setVideos] = useState<Record<string, TrainingVideo>>({});
  const [acks, setAcks] = useState<Record<string, MyAck>>({});
  const [loading, setLoading] = useState(true);
  const [openDoc, setOpenDoc] = useState<DeclarationDoc | null>(null);
  const [playing, setPlaying] = useState<TrainingVideo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const [docsRes, videosRes, acksRes] = await Promise.all([
      db.from("training_documents").select("id,title,file_path,file_type,video_tutorial_id,video_tutorial_ids,created_at").order("created_at", { ascending: false }),
      db.from("video_tutorials").select("id,title,video_url"),
      user ? db.from("training_acknowledgments").select("id,document_id,signed_at,signature_data").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    ]);
    if (docsRes.error) toast.error("Could not load the declaration");
    setDocs(docsRes.data || []);
    setVideos(Object.fromEntries((videosRes.data || []).map((v: TrainingVideo) => [v.id, v])));
    setAcks(Object.fromEntries((acksRes.data || []).filter((a: MyAck) => a.document_id).map((a: MyAck) => [a.document_id, a])));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div role="status" aria-label="Loading declaration" className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!docs.length) return null;

  const openVideos = openDoc ? docVideoIds(openDoc).map((id) => videos[id]).filter(Boolean) : [];

  return (
    <section className="space-y-3" aria-labelledby="declaration-heading">
      <h2 id="declaration-heading" className="text-lg font-semibold">Acknowledgment and Declaration</h2>
      {docs.map((doc) => {
        const docVideos = docVideoIds(doc).map((id) => videos[id]).filter(Boolean);
        return (
          <DeclarationCard
            key={doc.id}
            doc={doc}
            ack={acks[doc.id]}
            videos={docVideos}
            driverId={driverId}
            driverName={driverName}
            onRead={() => setOpenDoc(doc)}
            onWatch={(v) => openTrainingVideo(v, setPlaying)}
            onSigned={(ack) => setAcks((a) => ({ ...a, [doc.id]: ack }))}
          />
        );
      })}

      <Dialog open={!!openDoc} onOpenChange={(o) => { if (!o) setOpenDoc(null); }}>
        <DialogContent
          onInteractOutside={(e) => { if (playing) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (playing) { e.preventDefault(); setPlaying(null); } }}
          className="inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-card p-0 text-card-foreground data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[95dvh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border [&>button:last-child]:right-2 [&>button:last-child]:top-2 [&>button:last-child]:flex [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child>svg]:h-5 [&>button:last-child>svg]:w-5"
        >
          <DialogHeader className="shrink-0 border-b border-border px-4 pb-3 pt-4 text-left sm:px-6">
            <DialogTitle className="break-words pr-10 text-base leading-snug sm:text-lg">{openDoc?.title}</DialogTitle>
            <DialogDescription>Use the + and − buttons to make the text bigger. Close it to tick Yes and sign.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6">
            {openVideos.map((v) => <Button key={v.id} variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => openTrainingVideo(v, setPlaying)}><PlayCircle className="shrink-0" /><span className="min-w-0 break-words">Watch tutorial: {v.title}</span></Button>)}
            <div className="rounded-md bg-muted p-1.5 sm:p-4">
              {openDoc && <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                <A4DocumentViewer filePath={openDoc.file_path} fileType={openDoc.file_type} />
              </Suspense>}
            </div>
          </div>
          <div className="shrink-0 border-t border-border px-3 py-3 sm:px-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <Button className="min-h-11 w-full" onClick={() => setOpenDoc(null)}>Done reading</Button>
          </div>
        </DialogContent>
      </Dialog>
      {playing && <TrainingVideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
};

export default DriverDeclarationsSection;
