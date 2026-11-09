import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TrainingVideo { id: string; title: string; video_url: string }

/** Same Google Drive conversion used on the Video Tutorials page. */
export const toEmbedUrl = (url: string): string | null => {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  if (url.includes("/preview")) return url;
  return null;
};

/** Opens a tutorial: Drive videos play full screen in the app, other links open in a new tab. */
export const openTrainingVideo = (video: TrainingVideo, setPlaying: (v: TrainingVideo) => void) => {
  if (toEmbedUrl(video.video_url)) setPlaying(video);
  else window.open(video.video_url, "_blank", "noopener,noreferrer");
};

const TrainingVideoPlayer = ({ video, onClose }: { video: TrainingVideo; onClose: () => void }) => createPortal(
  <div className="pointer-events-auto fixed inset-0 z-[60] bg-foreground" style={{ height: "100dvh" }}>
    <iframe
      src={toEmbedUrl(video.video_url) || ""}
      className="absolute inset-0 h-full w-full border-0"
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      title={video.title}
    />
    <div className="absolute right-0 top-0 z-10 h-14 w-14" aria-hidden="true" />
    <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-foreground/70 to-transparent p-3">
      <h2 className="mr-3 flex-1 truncate text-sm font-medium text-background">{video.title}</h2>
      <Button size="icon" variant="ghost" className="min-h-11 min-w-11 text-background hover:bg-background/20" onClick={onClose} aria-label="Close video"><X className="h-6 w-6" /></Button>
    </div>
  </div>,
  document.body,
);

export default TrainingVideoPlayer;
