import React, { useState } from "react";
import { MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSharjahLocations } from "@/hooks/useSharjahLocations";

interface ManageSharjahLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageSharjahLocationsDialog = ({ open, onOpenChange }: ManageSharjahLocationsDialogProps) => {
  const { locations, loading, addLocation, deleteLocation } = useSharjahLocations();
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a location name");
      return;
    }
    setSubmitting(true);
    try {
      await addLocation(newName);
      setNewName("");
      toast.success("Location added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add location");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation(id);
      toast.success("Location deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete location");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            Manage Sharjah Locations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">Add New Location</Label>
            <Input
              placeholder="e.g. Al Nahda, Muwailih, Rolla..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              className="text-sm"
            />
            <Button onClick={handleAdd} size="sm" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Location
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <Label className="text-sm font-medium">Existing Locations ({locations.length})</Label>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No locations yet. Add the first one above.</p>
            ) : (
              locations.map((loc) => (
                <div key={loc.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                  <div className="font-medium text-sm">{loc.name}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(loc.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};