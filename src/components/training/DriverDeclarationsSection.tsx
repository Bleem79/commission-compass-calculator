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
        <Button className="min-h-11 w-full" variant="outline" onClick={onRead}><BookOpen />Read declaration</Button>
        {videos.map((v) => <Button key={v.id} variant="outline" className="min-h-11 w-full" onClick={() => onWatch(v)}><PlayCircle /><span className="truncate">Watch tutorial: {v.title}</span></Button>)}
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="text-sm"><span className="text-muted-foreground">Driver ID:</span> <strong>{driverId}</strong>{driverName && <> · {driverName}</>}</div>
        {ack ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="h-5 w-5" />Yes – I agree</p>
            {ack.signature_data && <img src={ack.signature_data} alt="Your signature" className="max-h-44 w-full rounded-md border border-border bg-background object-contain" />}
          </div>
        ) : (
          <>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3">
              <Checkbox className="mt-0.5 h-6 w-6" checked={agreed} onCheckedChange={(v) => { setAgreed(v === true); if (v !== true) setSignature(null); }} disabled={saving} />
              <span className="text-sm"><strong>Yes</strong> – I have read and understood this Acknowledgment and Declaration, and I agree to follow it.</span>
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

  const openVideo = openDoc?.video_tutorial_id ? videos[openDoc.video_tutorial_id] : undefined;

  return (
    <section className="space-y-3" aria-labelledby="declaration-heading">
      <h2 id="declaration-heading" className="text-lg font-semibold">Acknowledgment and Declaration</h2>
      {docs.map((doc) => {
        const video = doc.video_tutorial_id ? videos[doc.video_tutorial_id] : undefined;
        return (
          <DeclarationCard
            key={doc.id}
            doc={doc}
            ack={acks[doc.id]}
            video={video}
            driverId={driverId}
            driverName={driverName}
            onRead={() => setOpenDoc(doc)}
            onWatch={() => video && openTrainingVideo(video, setPlaying)}
            onSigned={(ack) => setAcks((a) => ({ ...a, [doc.id]: ack }))}
          />
        );
      })}

      <Dialog open={!!openDoc} onOpenChange={(o) => { if (!o) setOpenDoc(null); }}>
        <DialogContent onInteractOutside={(e) => { if (playing) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (playing) { e.preventDefault(); setPlaying(null); } }} className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto bg-card p-3 text-card-foreground sm:p-6">
          <DialogHeader>
            <DialogTitle className="pr-8">{openDoc?.title}</DialogTitle>
            <DialogDescription>Read the document below. Pinch to zoom if the text is small. Close it to tick Yes and sign.</DialogDescription>
          </DialogHeader>
          {openVideo && <Button variant="outline" className="min-h-11 w-full" onClick={() => openTrainingVideo(openVideo, setPlaying)}><PlayCircle />Watch tutorial: {openVideo.title}</Button>}
          <div className="rounded-md bg-muted p-2 sm:p-4">
            {openDoc && <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
              <A4DocumentViewer filePath={openDoc.file_path} fileType={openDoc.file_type} />
            </Suspense>}
          </div>
          <Button className="min-h-11 w-full" onClick={() => setOpenDoc(null)}>Done reading</Button>
        </DialogContent>
      </Dialog>
      {playing && <TrainingVideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </section>
  );
};

export default DriverDeclarationsSection;
