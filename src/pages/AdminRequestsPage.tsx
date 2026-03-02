import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, X, MessageSquare, Loader2, Clock, CheckCircle, XCircle, 
  Send, RefreshCw, AlertCircle, CalendarDays, FileSpreadsheet, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRequestTypes } from "@/hooks/useRequestTypes";
import { AdminRequestStats } from "@/components/admin-requests/AdminRequestStats";
import { AdminRequestsFilters } from "@/components/admin-requests/AdminRequestsFilters";
import { extractDayOffDate } from "@/utils/dateUtils";

// Lazy load heavy components
const DayOffCalendar = lazy(() => import("@/components/admin-requests/DayOffCalendar").then(m => ({ default: m.DayOffCalendar })));
const ManageTypesDialog = lazy(() => import("@/components/admin-requests/ManageTypesDialog").then(m => ({ default: m.ManageTypesDialog })));

interface DriverRequest {
  id: string;
  request_no: string | null;
  driver_id: string;
  driver_name: string | null;
  request_type: string;
  subject: string;
  description: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "approved", label: "Approved", color: "bg-green-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

const AdminRequestsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [controllerMap, setControllerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActualAdmin, setIsActualAdmin] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [controllerFilter, setControllerFilter] = useState("all");
  
  // Response dialog
  const [selectedRequest, setSelectedRequest] = useState<DriverRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Dialogs
  const [showTypesDialog, setShowTypesDialog] = useState(false);
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<DriverRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const { requestTypes } = useRequestTypes();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;
      
      // Fleet user gets read-only access to driver requests
      const isFleet = user.email?.toLowerCase() === 'fleet@amantaxi.com';
      if (isFleet) {
        setIsAdmin(true);
        setIsActualAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "advanced", "user"])
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
        setIsActualAdmin(data?.role === 'admin');
        
        if (!data) {
          toast.error("Access denied. Admin privileges required.");
          navigate("/home", { replace: true });
        }
      } catch (error: any) {
        console.error("Error checking admin role:", error);
        navigate("/home", { replace: true });
      }
    };
    checkAdminRole();
  }, [user?.id, user?.email, navigate]);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const reqResult = await supabase
        .from("driver_requests")
        .select("*")
        .order("created_at", { ascending: false });

      // Paginated fetch of driver_master_file
      let allMasterData: { driver_id: string; controller: string | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page, error: pageErr } = await supabase
          .from("driver_master_file")
          .select("driver_id, controller")
          .range(from, from + pageSize - 1);
        if (pageErr) break;
        if (!page || page.length === 0) break;
        allMasterData = allMasterData.concat(page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      if (reqResult.error) throw reqResult.error;
      setRequests(reqResult.data || []);

      const cMap: Record<string, string> = {};
      allMasterData.forEach((d) => {
        if (d.controller) cMap[d.driver_id] = d.controller;
      });
      setControllerMap(cMap);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const controllerList = useMemo(() => {
    return Array.from(new Set(Object.values(controllerMap))).sort();
  }, [controllerMap]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.driver_id.toLowerCase().includes(query) ||
          r.driver_name?.toLowerCase().includes(query) ||
          r.subject.toLowerCase().includes(query) ||
          r.request_no?.toLowerCase().includes(query)
      );
    }
    if (statusFilter !== "all") filtered = filtered.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") filtered = filtered.filter((r) => r.request_type === typeFilter);
    if (controllerFilter !== "all") {
      filtered = filtered.filter((r) => controllerMap[r.driver_id]?.toLowerCase() === controllerFilter.toLowerCase());
    }
    if (selectedCalendarDate) {
      filtered = filtered.filter((r) => {
        if (r.request_type !== "day_off") return false;
        return extractDayOffDate(r.subject) === selectedCalendarDate;
      });
    }
    return filtered;
  }, [requests, searchQuery, statusFilter, typeFilter, controllerFilter, selectedCalendarDate, controllerMap]);

  const handleClose = useCallback(() => navigate("/home"), [navigate]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("driver_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
      toast.success("Requests refreshed");
    } catch (error: any) {
      toast.error("Failed to refresh requests");
    } finally {
      setLoading(false);
    }
  }, []);

  const openResponseDialog = useCallback((request: DriverRequest) => {
    setSelectedRequest(request);
    setResponseText(request.admin_response || "");
    setNewStatus(request.status);
    setEditSubject(request.subject);
    setEditDescription(request.description);
  }, []);

  const handleSubmitResponse = useCallback(async () => {
    if (!selectedRequest || !user?.id) return;
    setSubmitting(true);
    try {
      const updateData: any = {
        status: newStatus,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
        subject: editSubject.trim(),
        description: editDescription.trim(),
      };
      if (responseText.trim()) updateData.admin_response = responseText.trim();

      const { error } = await supabase
        .from("driver_requests")
        .update(updateData)
        .eq("id", selectedRequest.id);
      if (error) throw error;

      setRequests((prev) => prev.map((r) => r.id === selectedRequest.id ? { ...r, ...updateData } : r));
      setSelectedRequest(null);

      // Notify fleet@amantaxi.com when request is approved or in_progress
      if (newStatus === "approved" || newStatus === "in_progress") {
        supabase.functions
          .invoke("send-request-notification", {
            body: {
              notifyFleet: true,
              driverId: selectedRequest.driver_id,
              driverName: selectedRequest.driver_name,
              requestType: selectedRequest.request_type,
              subject: editSubject.trim(),
              status: newStatus,
            },
          })
          .catch((err) => console.log("Fleet notification failed (non-critical):", err));
      }

      toast.success("Request updated successfully");
    } catch (error: any) {
      toast.error("Failed to update request");
    } finally {
      setSubmitting(false);
    }
  }, [selectedRequest, user?.id, newStatus, editSubject, editDescription, responseText]);

  const handleDeleteRequest = useCallback(async () => {
    if (!deleteConfirmRequest) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("driver_requests")
        .delete()
        .eq("id", deleteConfirmRequest.id);
      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== deleteConfirmRequest.id));
      setDeleteConfirmRequest(null);
      toast.success("Request deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete request");
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirmRequest]);

  // Dynamic import of xlsx for export
  const handleExportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const getLabel = (value: string) => requestTypes.find((t: { value: string; label: string }) => t.value === value)?.label || value;
    
    const exportData = requests.map((r) => ({
      "Request No": r.request_no || "-",
      "Driver ID": r.driver_id,
      "Driver Name": r.driver_name || "-",
      "Request Type": getLabel(r.request_type),
      "Subject": r.subject,
      "Description": r.description,
      "Status": STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status,
      "Admin Response": r.admin_response || "-",
      "Created At": formatDate(r.created_at),
      "Responded At": r.responded_at ? formatDate(r.responded_at) : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Requests");
    worksheet['!cols'] = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    XLSX.writeFile(workbook, `Driver_Requests_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported to Excel successfully");
  }, [requests, requestTypes]);

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    const Icon = status === "pending" ? Clock : status === "approved" ? CheckCircle : status === "rejected" ? XCircle : status === "in_progress" ? Loader2 : AlertCircle;
    return (
      <Badge className={`${statusOption?.color || "bg-gray-500"} text-white`}>
        <Icon className={`h-3 w-3 mr-1 ${status === "in_progress" ? "animate-spin" : ""}`} />
        {statusOption?.label || status}
      </Badge>
    );
  };

  const getRequestTypeLabel = (value: string) => {
    return requestTypes.find((t: { value: string; label: string }) => t.value === value)?.label || value;
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "approved" || r.status === "rejected").length,
    dayOff: requests.filter((r) => r.request_type === "day_off").length,
  }), [requests]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || typeFilter !== "all" || controllerFilter !== "all";

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setControllerFilter("all");
    setSelectedCalendarDate(null);
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/50 to-cyan-100/50 p-4 sm:p-6">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10" onClick={handleClose}>
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Home</span>
      </Button>

      <div className="max-w-6xl mx-auto pt-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Driver Requests Management</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleExportToExcel} variant="outline" size="sm" className="text-xs sm:text-sm">
              <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
            <Button onClick={() => setShowCalendar(!showCalendar)} variant={showCalendar ? "default" : "outline"} size="sm" className="text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Day Off Calendar</span>
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Day Off Calendar - lazy loaded */}
        {showCalendar && (
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <DayOffCalendar
              requests={requests}
              calendarMonth={calendarMonth}
              selectedDate={selectedCalendarDate}
              onMonthChange={setCalendarMonth}
              onDateSelect={setSelectedCalendarDate}
            />
          </Suspense>
        )}

        {/* Stats */}
        <AdminRequestStats stats={stats} />

        {/* Filters */}
        <AdminRequestsFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          controllerFilter={controllerFilter}
          controllerList={controllerList}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onTypeChange={setTypeFilter}
          onControllerChange={setControllerFilter}
          onClearAll={clearAllFilters}
          onManageTypes={() => setShowTypesDialog(true)}
          hasActiveFilters={!!hasActiveFilters}
        />

        {/* Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Requests Found</h2>
              <p className="text-muted-foreground">
                {requests.length === 0 ? "No driver requests have been submitted yet." : "No requests match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="bg-card border border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openResponseDialog(request)}
              >
                <CardHeader className="pb-2">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base font-semibold text-foreground break-words">
                          {request.subject}
                        </CardTitle>
                        {request.request_no && (
                          <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700 shrink-0">
                            {request.request_no}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusBadge(request.status)}
                        {isActualAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmRequest(request); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant="outline" className="text-xs">
                        {getRequestTypeLabel(request.request_type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Driver: {request.driver_name || request.driver_id}
                      </span>
                      {controllerMap[request.driver_id] && (
                        <span className="text-xs text-muted-foreground">• RC: {controllerMap[request.driver_id]}</span>
                      )}
                      <span className="text-xs text-muted-foreground">• {formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                  {request.admin_response && (
                    <div className="mt-2 text-xs text-blue-600">✓ Response provided</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Response Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Respond to Request
              {selectedRequest?.request_no && (
                <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700">
                  {selectedRequest.request_no}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Driver ID:</span>
                    <span className="ml-2 font-medium">{selectedRequest.driver_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Driver Name:</span>
                    <span className="ml-2 font-medium">{selectedRequest.driver_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium">{getRequestTypeLabel(selectedRequest.request_type)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedRequest.created_at)}</span>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <span className="text-muted-foreground">Revenue Controller In Charge:</span>
                  <span className="ml-2 font-medium text-primary">{controllerMap[selectedRequest.driver_id] || "N/A"}</span>
                </div>
                <div>
                  <Label htmlFor="edit-subject" className="text-muted-foreground text-sm">Subject:</Label>
                  <Select value={editSubject} onValueChange={setEditSubject}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="bg-white z-50">
                      {requestTypes.map((type: { value: string; label: string }) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-description" className="text-muted-foreground text-sm">Description:</Label>
                  <Textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="response">Admin Response</Label>
                <Textarea
                  id="response"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Enter your response to the driver..."
                  className="mt-1 min-h-[120px]"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">{responseText.length}/1000 characters</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button onClick={handleSubmitResponse} disabled={submitting || !newStatus} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Save Response</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Request Types Dialog - lazy loaded */}
      <Suspense fallback={null}>
        <ManageTypesDialog open={showTypesDialog} onOpenChange={setShowTypesDialog} />
      </Suspense>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmRequest} onOpenChange={() => setDeleteConfirmRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Day Off Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request from{" "}
              <strong>{deleteConfirmRequest?.driver_name || deleteConfirmRequest?.driver_id}</strong>?
              {deleteConfirmRequest?.request_no && (
                <span className="block mt-1 font-mono text-xs">{deleteConfirmRequest.request_no}</span>
              )}
              <br />
              <span className="text-destructive">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default AdminRequestsPage;
