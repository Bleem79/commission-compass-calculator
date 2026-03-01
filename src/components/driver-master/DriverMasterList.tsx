import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Loader2, Pencil, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DriverRecord {
  id: string;
  driver_id: string;
  driver_name: string;
  controller: string | null;
  created_at: string;
}

interface DriverMasterListProps {
  readOnly?: boolean;
  controllerFilter?: string | null;
}

const DriverMasterList = ({ readOnly = false, controllerFilter }: DriverMasterListProps) => {
  const [records, setRecords] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let allData: DriverRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("driver_master_file")
          .select("*")
          .order("driver_id", { ascending: true });

        if (controllerFilter) {
          query = query.ilike("controller", controllerFilter);
        }

        const { data, error } = await query
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setRecords(allData);
    } catch (err) {
      console.error("Error fetching driver master file:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();

    const channel = supabase
      .channel("driver_master_file_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_master_file" }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleEditStart = (record: DriverRecord) => {
    setEditingId(record.id);
    setEditValue(record.controller || "");
  };

  const handleEditSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("driver_master_file")
        .update({ controller: editValue.trim() || null } as any)
        .eq("id", id);
      if (error) throw error;
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, controller: editValue.trim() || null } : r))
      );
      toast.success("Controller updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update controller");
    } finally {
      setEditingId(null);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.driver_id.toLowerCase().includes(q) ||
      r.driver_name.toLowerCase().includes(q) ||
      (r.controller || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  const controllerSummary = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.controller || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sortedControllers = Object.entries(controllerSummary).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Uploaded Drivers ({filtered.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loading && records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sortedControllers.map(([name, count]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSearch(name === "Unassigned" ? "" : name)}
              >
                <span className="font-medium truncate">{name}</span>
                <span className="ml-2 shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Driver ID, Name, or Controller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {records.length === 0 ? "No records uploaded yet." : "No matching records found."}
          </p>
        ) : (
          <>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-muted">#</TableHead>
                  <TableHead className="sticky top-0 bg-muted">Driver ID</TableHead>
                  <TableHead className="sticky top-0 bg-muted">Driver Name</TableHead>
                   <TableHead className="sticky top-0 bg-muted">Controller</TableHead>
                   {!readOnly && <TableHead className="sticky top-0 bg-muted w-[80px]">Edit</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="font-medium">{r.driver_id}</TableCell>
                    <TableCell>{r.driver_name || "-"}</TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleEditSave(r.id);
                            if (e.key === "Escape") handleEditCancel();
                          }}
                        />
                      ) : (
                        r.controller || "-"
                      )}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        {editingId === r.id ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditSave(r.id)}>
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditCancel}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditStart(r)}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                    ) : (
                      <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" className="min-w-[36px]" onClick={() => setCurrentPage(p)}>
                        {p}
                      </Button>
                    )
                  )}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverMasterList;
