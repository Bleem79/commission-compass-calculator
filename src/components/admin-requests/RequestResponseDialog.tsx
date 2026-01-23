import React from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, STATUS_OPTIONS } from "@/components/shared/StatusBadge";
import { formatDateDisplay } from "@/utils/dateUtils";
import { getRequestTypeLabel, DriverRequest } from "@/constants/requestTypes";

interface RequestResponseDialogProps {
  request: DriverRequest | null;
  isOpen: boolean;
  onClose: () => void;
  responseText: string;
  newStatus: string;
  submitting: boolean;
  onResponseChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSubmit: () => void;
}

export const RequestResponseDialog = ({
  request,
  isOpen,
  onClose,
  responseText,
  newStatus,
  submitting,
  onResponseChange,
  onStatusChange,
  onSubmit,
}: RequestResponseDialogProps) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Respond to Request
            <StatusBadge status={request.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Details */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Request No:</span>
              <span className="text-sm font-medium">{request.request_no || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Driver:</span>
              <span className="text-sm font-medium">
                {request.driver_name || request.driver_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium">
                {getRequestTypeLabel(request.request_type)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subject:</span>
              <span className="text-sm font-medium">{request.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted:</span>
              <span className="text-sm">{formatDateDisplay(request.created_at)}</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm mb-2">
              <span className="font-medium">Description:</span> {request.description}
            </p>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label>Update Status</Label>
            <Select value={newStatus} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Response Text */}
          <div className="space-y-2">
            <Label>Admin Response (Optional)</Label>
            <Textarea
              value={responseText}
              onChange={(e) => onResponseChange(e.target.value)}
              placeholder="Enter your response to the driver..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Update Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
