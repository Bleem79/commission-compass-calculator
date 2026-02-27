import React, { useState } from "react";
import { Settings, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRequestTypes } from "@/hooks/useRequestTypes";

interface ManageTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageTypesDialog = ({ open, onOpenChange }: ManageTypesDialogProps) => {
  const { requestTypes, addType, deleteType } = useRequestTypes();
  const [newTypeValue, setNewTypeValue] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");

  const handleAdd = async () => {
    if (!newTypeValue.trim() || !newTypeLabel.trim()) {
      toast.error("Please enter both value and label");
      return;
    }
    try {
      await addType(newTypeValue.trim(), newTypeLabel.trim());
      setNewTypeValue("");
      setNewTypeLabel("");
      toast.success("Request type added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add request type");
    }
  };

  const handleDelete = async (value: string) => {
    try {
      await deleteType(value);
      toast.success("Request type deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete request type");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Manage Request Types
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <Label className="text-sm font-medium">Add New Request Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Value (e.g. leave_request)"
                value={newTypeValue}
                onChange={(e) => setNewTypeValue(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Label (e.g. Leave Request)"
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button onClick={handleAdd} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Request Type
            </Button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <Label className="text-sm font-medium">Existing Types ({requestTypes.length})</Label>
            {requestTypes.map((type: { value: string; label: string }) => (
              <div key={type.value} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{type.value}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(type.value)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
