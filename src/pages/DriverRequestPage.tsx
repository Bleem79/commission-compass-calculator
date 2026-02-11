import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageLayout } from "@/components/shared/PageLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatsCard, StatsGrid } from "@/components/shared/StatsCard";
import { DriverRequestForm, DriverRequestList } from "@/components/driver-requests";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { useDayOffValidation } from "@/hooks/useDayOffValidation";
import { DriverRequest, REQUEST_TYPES, MAX_DAY_OFF_PER_DAY } from "@/constants/requestTypes";

const DriverRequestPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { driverInfo, loading: credentialsLoading } = useDriverCredentials();
  
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const dayOffValidation = useDayOffValidation({
    driverId: driverInfo?.driverId || null,
    requestType,
    selectedDate,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!driverInfo?.driverId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("driver_requests")
          .select("*")
          .eq("driver_id", driverInfo.driverId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRequests(data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    if (!credentialsLoading) {
      fetchRequests();
    }
  }, [driverInfo?.driverId, credentialsLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!driverInfo?.driverId) {
      toast.error("Driver ID not found");
      return;
    }

    if (!requestType) {
      toast.error("Please select a request type");
      return;
    }

    if (requestType === "day_off" && !dayOffValidation.canSubmit) {
      toast.error(dayOffValidation.errorMessage || "Cannot submit request");
      return;
    }

    setSubmitting(true);

    const requestLabel = REQUEST_TYPES.find((t) => t.value === requestType)?.label || requestType;
    const subject =
      requestType === "day_off" && selectedDate
        ? `Day Off Request - ${format(selectedDate, "dd MMM yyyy")}`
        : requestLabel;
    const description =
      requestType === "day_off" && selectedDate
        ? `Requesting day off on ${format(selectedDate, "EEEE, dd MMMM yyyy")}`
        : `Request for ${requestLabel}`;

    try {
      const requestNo = `REQ-${driverInfo.driverId}-${Date.now()}`;
      const shouldAutoApprove = requestType === "day_off";

      let remainingSlots = 0;
      let status = "pending";
      let adminResponse: string | null = null;
      let respondedAt: string | null = null;

      if (shouldAutoApprove && selectedDate) {
        status = "approved";
        adminResponse = "Auto-approved: Day off slot available";
        respondedAt = new Date().toISOString();

        const dateStr = format(selectedDate, "dd MMM yyyy");
        const { data: approvedCount } = await supabase.rpc("count_approved_day_off_requests", {
          p_date_str: dateStr,
        });
        remainingSlots = MAX_DAY_OFF_PER_DAY - (approvedCount || 0) - 1;
      }

      const { data, error } = await supabase
        .from("driver_requests")
        .insert({
          driver_id: driverInfo.driverId,
          driver_name: driverInfo.driverName,
          request_type: requestType,
          subject,
          description,
          request_no: requestNo,
          status,
          admin_response: adminResponse,
          responded_at: respondedAt,
        })
        .select()
        .single();

      if (error) throw error;

      setRequests([data, ...requests]);
      setRequestType("");
      setSelectedDate(undefined);
      setShowForm(false);

      if (shouldAutoApprove && selectedDate) {
        toast.success(`Day off request auto-approved! ✅ (${remainingSlots} slots remaining)`);

        supabase.functions
          .invoke("send-day-off-notification", {
            body: {
              driverId: driverInfo.driverId,
              dayOffDate: format(selectedDate, "dd MMM yyyy"),
              remainingSlots,
            },
          })
          .catch((err) => console.log("Push notification failed (non-critical):", err));
      } else {
        toast.success("Request submitted successfully");
      }

      // Notify the assigned controller via push notification
      supabase.functions
        .invoke("send-request-notification", {
          body: {
            driverId: driverInfo.driverId,
            driverName: driverInfo.driverName,
            requestType,
            subject,
          },
        })
        .catch((err) => console.log("Controller notification failed (non-critical):", err));
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const resolvedCount = requests.filter((r) => r.status !== "pending").length;

  if (credentialsLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <PageLayout
      title="My Requests"
      icon={<MessageSquare className="h-6 w-6" />}
      backPath="/driver-portal"
      backLabel="Back to Portal"
      headerActions={
        !showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        )
      }
    >
      {/* Stats */}
      <StatsGrid columns={2}>
        <StatsCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Pending"
          value={pendingCount}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatsCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Resolved"
          value={resolvedCount}
          gradient="from-green-500 to-emerald-500"
        />
      </StatsGrid>

      {/* Form */}
      {showForm && (
        <DriverRequestForm
          requestType={requestType}
          selectedDate={selectedDate}
          onRequestTypeChange={setRequestType}
          onDateChange={setSelectedDate}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setRequestType("");
            setSelectedDate(undefined);
          }}
          submitting={submitting}
          availableSlots={dayOffValidation.availableSlots}
          loadingSlots={dayOffValidation.loadingSlots}
          hasExistingRequest={dayOffValidation.hasExistingRequest}
          cycleRequestCount={dayOffValidation.cycleRequestCount}
          cycleRange={dayOffValidation.cycleRange}
          canSubmit={dayOffValidation.canSubmit}
        />
      )}

      {/* Request List */}
      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : (
        <DriverRequestList requests={requests} />
      )}
    </PageLayout>
  );
};

export default DriverRequestPage;