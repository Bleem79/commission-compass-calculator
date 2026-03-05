import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Video, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface VideoTutorial {
  id: string;
  title: string;
  video_url: string;
  created_at: string;
}

const VideoTutorialsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    fetchVideos();
  }, [isAuthenticated]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("video_tutorials")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error("Error fetching videos:", err);
      toast.error("Failed to load video tutorials");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!title.trim() || !videoUrl.trim()) {
      toast.error("Please fill in both title and video URL");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("video_tutorials").insert({
        title: title.trim(),
        video_url: videoUrl.trim(),
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
      toast.success("Video tutorial added");
      setTitle("");
      setVideoUrl("");
      setShowAddDialog(false);
      fetchVideos();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add video tutorial");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("video_tutorials").delete().eq("id", id);
      if (error) throw error;
      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Video tutorial deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete video tutorial");
    }
  };

  return (
    <PageLayout
      title="Video Tutorials"
      icon={<Video className="h-6 w-6 text-primary" />}
      backPath="/driver-portal"
      backLabel="Back to Portal"
      maxWidth="2xl"
    >
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Video
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No video tutorials available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <Card key={video.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base sm:text-lg leading-snug break-words">{video.title}</h3>
                <p className="text-sm text-muted-foreground break-all mt-1 line-clamp-2">{video.video_url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 min-h-[44px] min-w-[44px]"
                  onClick={() => window.open(video.video_url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-5 w-5" />
                </Button>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-10 w-10 min-h-[44px] min-w-[44px]"
                    onClick={() => handleDelete(video.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Video Tutorial</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                placeholder="e.g. How to use the app"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Google Drive Video Link</label>
              <Input
                placeholder="https://drive.google.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default VideoTutorialsPage;
