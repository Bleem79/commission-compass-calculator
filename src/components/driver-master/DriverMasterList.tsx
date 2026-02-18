import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users, Loader2, Pencil, Check, X } from "lucide-react";
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
}

const DriverMasterList = ({ readOnly = false }: DriverMasterListProps) => {
  const [records, setRecords] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let allData: DriverRecord[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("driver_master_file")
          .select("*")
          .order("driver_id", { ascending: true })
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
          <div className="max-h-[400px] overflow-auto rounded-md border">
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
                {filtered.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
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
        )}
      </CardContent>
    </Card>
  );
};

export default DriverMasterList;
