import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DriverRequestCard } from "./DriverRequestCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { MessageSquare } from "lucide-react";
import { DriverRequest } from "@/constants/requestTypes";

interface DriverRequestListProps {
  requests: DriverRequest[];
}

export const DriverRequestList = ({ requests }: DriverRequestListProps) => {
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
        title="No requests yet"
        description="Submit a request using the button above to get started."
      />
    );
  }

  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          Pending
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="resolved" className="flex items-center gap-2">
          Resolved
          {resolvedRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
              {resolvedRequests.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-4">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No pending requests</div>
        ) : (
          pendingRequests.map((request) => (
            <DriverRequestCard key={request.id} request={request} />
          ))
        )}
      </TabsContent>

      <TabsContent value="resolved" className="space-y-4">
        {resolvedRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No resolved requests</div>
        ) : (
          resolvedRequests.map((request) => (
            <DriverRequestCard key={request.id} request={request} />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};
