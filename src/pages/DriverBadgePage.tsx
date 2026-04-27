import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Award, Upload, Trash2, Download, Image as ImageIcon, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";

interface BadgeRow {
  id: string;
  driver_id: string;
  month: string;
  badge_type: string;
  image_path: string | null;
  created_at: string;
}

const REQUIRED_COLS = ["Driver ID No.", "Month", "Type of Badge"] as const;
const BUCKET = "driver-badges";

const DriverBadgePage = () => {
  const { user } = useAuth();
  const { loading: adminLoading, isAdmin } = useAdminCheck();

  const [rows, setRows] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driver_badges")
      .select("id, driver_id, month, badge_type, image_path, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load badges", { description: error.message });
    } else {
      setRows((data as BadgeRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.driver_id.toLowerCase().includes(q) ||
        r.month.toLowerCase().includes(q) ||
        r.badge_type.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Driver ID No.", "Month", "Type of Badge"],
      ["DRV001", "January 2025", "Gold"],
      ["DRV002", "January 2025", "Silver"],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Driver Badges");
    XLSX.writeFile(wb, "driver_badges_template.xlsx");
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.id) {
      toast.error("You must be signed in.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (!json.length) throw new Error("The Excel file is empty.");

      const firstRow = json[0];
      const missing = REQUIRED_COLS.filter((c) => !(c in firstRow));
      if (missing.length) {
        throw new Error(`Missing columns: ${missing.join(", ")}`);
      }

      const records = json
        .map((r) => ({
          driver_id: String(r["Driver ID No."] ?? "").trim(),
          month: String(r["Month"] ?? "").trim(),
          badge_type: String(r["Type of Badge"] ?? "").trim(),
          uploaded_by: user.id,
        }))
        .filter((r) => r.driver_id && r.month && r.badge_type);

      if (!records.length) throw new Error("No valid rows found in the file.");

      const { error } = await supabase.from("driver_badges").insert(records);
      if (error) throw error;

      toast.success(`Uploaded ${records.length} badge record(s).`);
      await fetchRows();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAll = async () => {
    try {
      // Best-effort: remove all images in bucket
      const { data: files } = await supabase.storage.from(BUCKET).list("", {
        limit: 1000,
      });
      if (files && files.length) {
        await supabase.storage
          .from(BUCKET)
          .remove(files.map((f) => f.name));
      }
      const { error } = await supabase
        .from("driver_badges")
        .delete()
        .not("id", "is", null);
      if (error) throw error;
      toast.success("All badge records deleted.");
      await fetchRows();
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  const handleDeleteRow = async (row: BadgeRow) => {
    try {
      if (row.image_path) {
        await supabase.storage.from(BUCKET).remove([row.image_path]);
      }
      const { error } = await supabase
        .from("driver_badges")
        .delete()
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Badge deleted.");
      await fetchRows();
    } catch (err: any) {
      toast.error("Delete failed", { description: err.message });
    }
  };

  const handleImageUpload = async (
    row: BadgeRow,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(jpe?g|png)$/i.test(file.name)) {
      toast.error("Only JPG or PNG files are allowed.");
      return;
    }
    try {
      // Remove old image if present
      if (row.image_path) {
        await supabase.storage.from(BUCKET).remove([row.image_path]);
      }
      const ext = file.name.split(".").pop();
      const path = `${row.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("driver_badges")
        .update({ image_path: path })
        .eq("id", row.id);
      if (dbErr) throw dbErr;
      toast.success("Badge image uploaded.");
      await fetchRows();
    } catch (err: any) {
      toast.error("Image upload failed", { description: err.message });
    } finally {
      const input = imageInputRefs.current[row.id];
      if (input) input.value = "";
    }
  };

  const handleDeleteImage = async (row: BadgeRow) => {
    if (!row.image_path) return;
    try {
      await supabase.storage.from(BUCKET).remove([row.image_path]);
      const { error } = await supabase
        .from("driver_badges")
        .update({ image_path: null })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Badge image removed.");
      await fetchRows();
    } catch (err: any) {
      toast.error("Failed to remove image", { description: err.message });
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  if (adminLoading) {
    return (
      <PageLayout title="Driver Badge" icon={<Award className="h-6 w-6 text-amber-500" />}>
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Driver Badge"
      icon={<Award className="h-6 w-6 text-amber-500" />}
      gradient="from-background via-amber-50/40 to-yellow-100/40"
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleExcelUpload}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Excel"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={!rows.length}>
                <Trash2 className="h-4 w-4" />
                Delete All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all badges?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove every badge record and its uploaded image.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    >
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Badges ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search driver, month, type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : !filtered.length ? (
            <EmptyState
              icon={<Award className="h-12 w-12 text-muted-foreground" />}
              title="No badges yet"
              description="Download the template, fill it in, then upload to get started."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/50">
                  <TableHead className="font-semibold">Driver ID No.</TableHead>
                  <TableHead className="font-semibold">Month</TableHead>
                  <TableHead className="font-semibold">Type of Badge</TableHead>
                  <TableHead className="font-semibold">Badge Image</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const imgUrl = getImageUrl(row.image_path);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.driver_id}</TableCell>
                      <TableCell>{row.month}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          {row.badge_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {imgUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(imgUrl)}
                            className="block"
                          >
                            <img
                              src={imgUrl}
                              alt={`Badge for ${row.driver_id}`}
                              className="h-12 w-12 rounded-md object-cover border border-border hover:ring-2 hover:ring-amber-400 transition"
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No image</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            ref={(el) => (imageInputRefs.current[row.id] = el)}
                            type="file"
                            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => handleImageUpload(row, e)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => imageInputRefs.current[row.id]?.click()}
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            <ImageIcon className="h-4 w-4" />
                            {row.image_path ? "Replace" : "Upload"}
                          </Button>
                          {row.image_path && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteImage(row)}
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete badge?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove the badge record for {row.driver_id} ({row.month}).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteRow(row)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
    </PageLayout>
  );
};

export default DriverBadgePage;