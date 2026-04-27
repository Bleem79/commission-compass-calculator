import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, Save, X, Award, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  sort_order: number;
}

const BUCKET = "driver-badges";
const CATALOG_PREFIX = "catalog";

export const BadgeCatalog = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_badge_catalog")
      .select("id, title, description, image_path, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load catalog", { description: error.message });
    } else {
      setItems((data as CatalogItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditing(item);
    setForm({ title: item.title, description: item.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    if (!user?.id) {
      toast.error("You must be signed in.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("driver_badge_catalog")
          .update({
            title: form.title.trim(),
            description: form.description.trim(),
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Badge tier updated.");
      } else {
        const nextOrder =
          items.length === 0
            ? 0
            : Math.max(...items.map((i) => i.sort_order)) + 1;
        const { error } = await supabase.from("driver_badge_catalog").insert({
          title: form.title.trim(),
          description: form.description.trim(),
          sort_order: nextOrder,
          created_by: user.id,
        });
        if (error) throw error;
        toast.success("Badge tier created.");
      }
      setDialogOpen(false);
      await fetchItems();
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    try {
      if (item.image_path) {
        await supabase.storage.from(BUCKET).remove([item.image_path]);
      }
      const { error } = await supabase
        .from("driver_badge_catalog")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Badge tier deleted.");
      await fetchItems();
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  const handleImageUpload = async (
    item: CatalogItem,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      toast.error("Only JPG or PNG files are allowed.");
      return;
    }
    try {
      if (item.image_path) {
        await supabase.storage.from(BUCKET).remove([item.image_path]);
      }
      const ext = file.name.split(".").pop();
      const path = `${CATALOG_PREFIX}/${item.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("driver_badge_catalog")
        .update({ image_path: path })
        .eq("id", item.id);
      if (dbErr) throw dbErr;
      toast.success("Badge image uploaded.");
      await fetchItems();
    } catch (err: any) {
      toast.error("Image upload failed", { description: err.message });
    } finally {
      const input = imageInputRefs.current[item.id];
      if (input) input.value = "";
    }
  };

  const handleRemoveImage = async (item: CatalogItem) => {
    if (!item.image_path) return;
    try {
      await supabase.storage.from(BUCKET).remove([item.image_path]);
      const { error } = await supabase
        .from("driver_badge_catalog")
        .update({ image_path: null })
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Image removed.");
      await fetchItems();
    } catch (err: any) {
      toast.error("Failed to remove image", { description: err.message });
    }
  };

  const moveItem = async (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= items.length) return;
    const a = items[idx];
    const b = items[target];
    try {
      // Swap sort_order in two updates
      await supabase
        .from("driver_badge_catalog")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id);
      await supabase
        .from("driver_badge_catalog")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id);
      await fetchItems();
    } catch (err: any) {
      toast.error("Reorder failed", { description: err.message });
    }
  };

  const headerGradient = useMemo(
    () =>
      "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white",
    [],
  );

  return (
    <Card className="border-amber-200/60">
      <CardHeader className="border-b bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Award className="h-5 w-5 text-amber-500" />
            Badge Catalog ({items.length})
          </CardTitle>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 px-4 text-muted-foreground text-sm">
            No badge tiers yet. Click <span className="font-semibold text-amber-700">Add Tier</span> to create your first one (e.g. Safe Driver / Bronze).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className={`grid grid-cols-12 px-4 py-3 text-xs font-bold tracking-wider uppercase ${headerGradient}`}>
              <div className="col-span-1">#</div>
              <div className="col-span-4 flex items-center gap-2">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Title Name
              </div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2 text-center">Badge</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {items.map((item, idx) => {
                const imgUrl = getImageUrl(item.image_path);
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center px-4 py-3 hover:bg-amber-50/40 transition"
                  >
                    <div className="col-span-1 flex items-center gap-1">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-xs"
                          aria-label="Move up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === items.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-xs"
                          aria-label="Move down"
                        >
                          ▼
                        </button>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="col-span-4 font-bold uppercase tracking-wide text-sm text-foreground">
                      {item.title}
                    </div>
                    <div className="col-span-3 text-sm text-amber-700 font-semibold">
                      {item.description}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      {imgUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(imgUrl)}
                          className="block"
                        >
                          <img
                            src={imgUrl}
                            alt={item.title}
                            className="h-14 w-14 rounded-md object-cover border border-amber-200 hover:ring-2 hover:ring-amber-400 transition shadow-sm"
                          />
                        </button>
                      ) : (
                        <div className="h-14 w-14 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1 flex-wrap">
                      <input
                        ref={(el) => (imageInputRefs.current[item.id] = el)}
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleImageUpload(item, e)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => imageInputRefs.current[item.id]?.click()}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        title={item.image_path ? "Replace image" : "Upload image"}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </Button>
                      {item.image_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveImage(item)}
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(item)}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete tier?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove "{item.title}" from the catalog. This also deletes its image.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Badge Tier" : "Add Badge Tier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Title Name</label>
              <Input
                placeholder="e.g. Safe Driver"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Description</label>
              <Input
                placeholder="e.g. Bronze"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can upload a JPG/PNG badge image after saving from the row's image button.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Badge Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Badge" className="w-full h-auto rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};