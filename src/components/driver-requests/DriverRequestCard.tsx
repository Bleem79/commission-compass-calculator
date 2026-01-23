import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDateDisplay, extractDayOffDate } from "@/utils/dateUtils";
import { getRequestTypeLabel, DriverRequest } from "@/constants/requestTypes";
import { format } from "date-fns";

interface DriverRequestCardProps {
  request: DriverRequest;
}

export const DriverRequestCard = ({ request }: DriverRequestCardProps) => {
  const dayOffDate = request.request_type === "day_off" ? extractDayOffDate(request.subject) : null;

  return (
    <Card className="bg-card border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-semibold text-foreground">
              {getRequestTypeLabel(request.request_type)}
            </p>
            {request.request_no && (
              <p className="text-xs text-muted-foreground">{request.request_no}</p>
            )}
          </div>
          <StatusBadge status={request.status} />
        </div>

        {dayOffDate && (
          <div className="mb-2 px-2 py-1 bg-blue-50 rounded text-sm text-blue-700 inline-block">
            📅 {format(new Date(dayOffDate), "EEEE, dd MMM yyyy")}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-2">{request.subject}</p>

        <p className="text-xs text-muted-foreground">
          Submitted: {formatDateDisplay(request.created_at)}
        </p>

        {request.admin_response && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Admin Response:</p>
            <p className="text-sm text-foreground">{request.admin_response}</p>
            {request.responded_at && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatDateDisplay(request.responded_at)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
