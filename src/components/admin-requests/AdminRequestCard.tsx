import React from "react";
import { Trash2, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateDisplay, extractDayOffDate } from "@/utils/dateUtils";
import { getRequestTypeLabel, DriverRequest } from "@/constants/requestTypes";
import { format } from "date-fns";

interface AdminRequestCardProps {
  request: DriverRequest;
  onRespond: (request: DriverRequest) => void;
  onDelete: (request: DriverRequest) => void;
}

export const AdminRequestCard = ({
  request,
  onRespond,
  onDelete,
}: AdminRequestCardProps) => {
  const dayOffDate = request.request_type === "day_off" ? extractDayOffDate(request.subject) : null;

  return (
    <Card
      className="bg-card border-border hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onRespond(request)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">
                {request.driver_name || request.driver_id}
              </span>
              <StatusBadge status={request.status} />
            </div>
            {request.request_no && (
              <p className="text-xs text-muted-foreground">{request.request_no}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(request);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-primary">
            {getRequestTypeLabel(request.request_type)}
          </span>
          {dayOffDate && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              📅 {format(new Date(dayOffDate), "dd MMM yyyy")}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {request.description}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDateDisplay(request.created_at)}</span>
          {request.admin_response && (
            <span className="flex items-center gap-1 text-green-600">
              <MessageSquare className="h-3 w-3" />
              Responded
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
