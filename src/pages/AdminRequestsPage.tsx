import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, Loader2, Clock, CheckCircle, XCircle, 
  Send, RefreshCw, AlertCircle, CalendarDays, FileSpreadsheet, Trash2, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AdminRequestCard } from "@/components/admin-requests/AdminRequestCard";
import { extractDayOffDate } from "@/utils/dateUtils";
import { DriverRequest, getRequestTypeLabel } from "@/constants/requestTypes";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";
import { PageLayout } from "@/components/shared/PageLayout";
import { Input } from "@/components/ui/input";

const DayOffCalendar = lazy(() => import("@/components/admin-requests/DayOffCalendar").then(m => ({ default: m.DayOffCalendar })));
const ManageTypesDialog = lazy(() => import("@/components/admin-requests/ManageTypesDialog").then(m => ({ default: m.ManageTypesDialog })));

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "approved", label: "Approved", color: "bg-green-500" },
  { value: "rejected", label: "Rejected", color: "bg-red-500" },
];

const formatDate = (dateStr: string) => {
  try { return format(new Date(dateStr), "MMM dd, yyyy hh:mm a"); } catch { return dateStr; }
};

const AdminRequestsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [requests, setRequests] = useState<DriverRequest[]>([]);
  const [controllerMap, setControllerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActualAdmin, setIsActualAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [controllerFilter, setControllerFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<DriverRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [fleetRemarks, setFleetRemarks] = useState("");
  const [showTypesDialog, setShowTypesDialog] = useState(false);
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<DriverRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [exportingDuplicates, setExportingDuplicates] = useState(false);

  const { requestTypes } = useRequestTypes();
  const { isSupported: pushSupported, isGranted: pushGranted, requestPermission } = usePushNotifications();
  usePushSubscriptionRegistration(user?.id, null);

  const isFleetUser = user?.email?.toLowerCase() === 'fleet@amantaxi.com';

  useEffect(() => { if (!isAuthenticated) navigate("/login", { replace: true }); }, [isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;
      const isFleet = user.email?.toLowerCase() === 'fleet@amantaxi.com';
      if (isFleet) { setIsAdmin(true); setIsActualAdmin(false); return; }
      try {
        const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).in("role", ["admin", "advanced", "user"]).maybeSingle();
        if (error) throw error;
        setIsAdmin(!!data); setIsActualAdmin(data?.role === 'admin');
        if (!data) { toast.error("Access denied."); navigate("/home", { replace: true }); }
      } catch { navigate("/home", { replace: true }); }
    };
    checkAdminRole();
  }, [user?.id, user?.email, navigate]);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const reqResult = await supabase.from("driver_requests").select("*").order("created_at", { ascending: false });
      let allMasterData: { driver_id: string; controller: string | null }[] = [];
      let from = 0;
      while (true) {
        const { data: page, error: pageErr } = await supabase.from("driver_master_file").select("driver_id, controller").range(from, from + 999);
        if (pageErr || !page || page.length === 0) break;
        allMasterData = allMasterData.concat(page);
        if (page.length < 1000) break;
        from += 1000;
      }
      if (reqResult.error) throw reqResult.error;
      setRequests(reqResult.data || []);
      const cMap: Record<string, string> = {};
      allMasterData.forEach((d) => { if (d.controller) cMap[d.driver_id] = d.controller; });
      setControllerMap(cMap);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const controllerList = useMemo(() => Array.from(new Set(Object.values(controllerMap))).sort(), [controllerMap]);

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    if (isFleetUser) filtered = filtered.filter((r) => r.status !== "pending");
    if (searchQuery) { const q = searchQuery.toLowerCase(); filtered = filtered.filter((r) => r.driver_id.toLowerCase().includes(q) || r.driver_name?.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || r.request_no?.toLowerCase().includes(q)); }
    if (statusFilter !== "all") filtered = filtered.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") filtered = filtered.filter((r) => r.request_type === typeFilter);
    if (controllerFilter !== "all") filtered = filtered.filter((r) => controllerMap[r.driver_id]?.toLowerCase() === controllerFilter.toLowerCase());
    if (selectedCalendarDate) filtered = filtered.filter((r) => r.request_type === "day_off" && extractDayOffDate(r.subject) === selectedCalendarDate);
    return filtered;
  }, [requests, searchQuery, statusFilter, typeFilter, controllerFilter, selectedCalendarDate, controllerMap, isFleetUser]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try { const { data, error } = await supabase.from("driver_requests").select("*").order("created_at", { ascending: false }); if (error) throw error; setRequests(data || []); toast.success("Refreshed"); }
    catch { toast.error("Failed to refresh"); } finally { setLoading(false); }
  }, []);

  const openResponseDialog = useCallback((request: DriverRequest) => {
    setSelectedRequest(request); setResponseText(request.admin_response || ""); setNewStatus(request.status); setEditSubject(request.subject); setEditDescription(request.description); setFleetRemarks(request.fleet_remarks || "");
  }, []);

  const handleSubmitResponse = useCallback(async () => {
    if (!selectedRequest || !user?.id) return;
    setSubmitting(true);
    try {
      const updateData: any = { status: newStatus, responded_by: user.id, responded_at: new Date().toISOString(), subject: editSubject.trim(), description: editDescription.trim() };
      if (responseText.trim()) updateData.admin_response = responseText.trim();
      const { error } = await supabase.from("driver_requests").update(updateData).eq("id", selectedRequest.id);
      if (error) throw error;
      setRequests((prev) => prev.map((r) => r.id === selectedRequest.id ? { ...r, ...updateData } : r));
      setSelectedRequest(null);
      if (newStatus === "approved" || newStatus === "in_progress") {
        supabase.functions.invoke("send-request-notification", { body: { notifyFleet: true, driverId: selectedRequest.driver_id, driverName: selectedRequest.driver_name, requestType: selectedRequest.request_type, subject: editSubject.trim(), status: newStatus } }).catch(() => {});
      }
      toast.success("Request updated");
    } catch { toast.error("Failed to update"); } finally { setSubmitting(false); }
  }, [selectedRequest, user?.id, newStatus, editSubject, editDescription, responseText]);

  const handleFleetRemarksSubmit = useCallback(async () => {
    if (!selectedRequest || !user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("driver_requests").update({ fleet_remarks: fleetRemarks.trim() || null }).eq("id", selectedRequest.id);
      if (error) throw error;
      setRequests((prev) => prev.map((r) => r.id === selectedRequest.id ? { ...r, fleet_remarks: fleetRemarks.trim() || null } : r));
      setSelectedRequest(null); toast.success("Remarks saved");
    } catch { toast.error("Failed to save"); } finally { setSubmitting(false); }
  }, [selectedRequest, user?.id, fleetRemarks]);

  const handleDeleteRequest = useCallback(async () => {
    if (!deleteConfirmRequest) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("driver_requests").delete().eq("id", deleteConfirmRequest.id);
      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== deleteConfirmRequest.id));
      setDeleteConfirmRequest(null); toast.success("Request deleted");
    } catch { toast.error("Failed to delete"); } finally { setDeleting(false); }
  }, [deleteConfirmRequest]);

  const handleExportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const getLabel = (value: string) => requestTypes.find((t: any) => t.value === value)?.label || value;
    const exportData = requests.map((r) => ({ "Request No": r.request_no || "-", "Driver ID": r.driver_id, "Driver Name": r.driver_name || "-", "Request Type": getLabel(r.request_type), "Subject": r.subject, "Description": r.description, "Status": STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status, "Admin Response": r.admin_response || "-", "Created At": formatDate(r.created_at), "Responded At": r.responded_at ? formatDate(r.responded_at) : "-" }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Requests");
    XLSX.writeFile(workbook, `Driver_Requests_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported");
  }, [requests, requestTypes]);

  const findDuplicates = useCallback(() => {
    const seen = new Map<string, DriverRequest[]>();
    requests.forEach((r) => {
      const key = `${r.driver_id}|${r.request_type}|${r.subject}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(r);
    });
    const duplicates: DriverRequest[] = [];
    seen.forEach((group) => {
      if (group.length > 1) {
        // Keep the first (oldest by created_at), mark rest as duplicates
        const sorted = group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        duplicates.push(...sorted.slice(1));
      }
    });
    return duplicates;
  }, [requests]);

  const handleExportDuplicates = useCallback(async () => {
    setExportingDuplicates(true);
    try {
      const duplicates = findDuplicates();
      if (duplicates.length === 0) { toast.info("No duplicate requests found"); return; }
      const XLSX = await import("xlsx");
      const getLabel = (value: string) => requestTypes.find((t: any) => t.value === value)?.label || value;
      const exportData = duplicates.map((r) => ({ "Request No": r.request_no || "-", "Driver ID": r.driver_id, "Driver Name": r.driver_name || "-", "Request Type": getLabel(r.request_type), "Subject": r.subject, "Status": STATUS_OPTIONS.find(s => s.value === r.status)?.label || r.status, "Created At": formatDate(r.created_at) }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Duplicate Requests");
      XLSX.writeFile(workbook, `Duplicate_Requests_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast.success(`Found ${duplicates.length} duplicate(s) — exported to Excel`);
    } catch { toast.error("Failed to export duplicates"); } finally { setExportingDuplicates(false); }
  }, [findDuplicates, requestTypes]);

  const handleDeleteDuplicates = useCallback(async () => {
    const duplicates = findDuplicates();
    if (duplicates.length === 0) { toast.info("No duplicate requests found"); return; }
    const ids = duplicates.map((r) => r.id);
    try {
      // Delete in batches of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error } = await supabase.from("driver_requests").delete().in("id", batch);
        if (error) throw error;
      }
      setRequests((prev) => prev.filter((r) => !ids.includes(r.id)));
      toast.success(`Deleted ${duplicates.length} duplicate request(s)`);
    } catch { toast.error("Failed to delete duplicates"); }
  }, [findDuplicates]);

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    const Icon = status === "pending" ? Clock : status === "approved" ? CheckCircle : status === "rejected" ? XCircle : status === "in_progress" ? Loader2 : AlertCircle;
    return <Badge className={`${opt?.color || "bg-gray-500"} text-white`}><Icon className={`h-3 w-3 mr-1 ${status === "in_progress" ? "animate-spin" : ""}`} />{opt?.label || status}</Badge>;
  };

  const getRequestTypeLabel = (value: string) => requestTypes.find((t: any) => t.value === value)?.label || value;

  const stats = useMemo(() => ({
    total: requests.length, pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "approved" || r.status === "rejected").length,
    dayOff: requests.filter((r) => r.request_type === "day_off").length,
  }), [requests]);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || typeFilter !== "all" || controllerFilter !== "all";
  const clearAllFilters = useCallback(() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); setControllerFilter("all"); setSelectedCalendarDate(null); }, []);

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <PageLayout
      title="Driver Requests Management"
      icon={<MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleExportToExcel} variant="outline" size="sm" className="text-xs sm:text-sm"><FileSpreadsheet className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Export Excel</span></Button>
          <Button onClick={() => setShowCalendar(!showCalendar)} variant={showCalendar ? "default" : "outline"} size="sm" className="text-xs sm:text-sm"><CalendarDays className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Day Off Calendar</span></Button>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          {pushSupported && !pushGranted && <Button onClick={requestPermission} variant="outline" size="sm" className="text-xs sm:text-sm"><Bell className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Enable Notifications</span></Button>}
          {pushGranted && <Badge variant="outline" className="text-xs gap-1 py-1"><Bell className="h-3 w-3" /> Notifications On</Badge>}
        </div>
      }
    >
      {showCalendar && (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <DayOffCalendar requests={requests.filter(r => r.request_type === "day_off")} calendarMonth={calendarMonth} onMonthChange={setCalendarMonth} onDateSelect={(date) => setSelectedCalendarDate(date)} selectedDate={selectedCalendarDate} />
        </Suspense>
      )}

      <AdminRequestStats stats={stats} />

      <AdminRequestsFilters
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        typeFilter={typeFilter} onTypeChange={setTypeFilter}
        controllerFilter={controllerFilter} onControllerChange={setControllerFilter}
        controllerList={controllerList}
        hasActiveFilters={!!hasActiveFilters} onClearAll={clearAllFilters}
        onManageTypes={() => setShowTypesDialog(true)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filteredRequests.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No Requests Found</h3><p className="text-muted-foreground text-sm">{hasActiveFilters ? "Try adjusting your filters" : "No driver requests yet"}</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{filteredRequests.length} request(s)</p></div>
          {filteredRequests.map((request) => (
            <AdminRequestCard key={request.id} request={request} onRespond={openResponseDialog} onDelete={setDeleteConfirmRequest} isAdmin={isActualAdmin} controllerName={controllerMap[request.driver_id]} />
          ))}
        </div>
      )}

      {/* Response Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Respond to Request</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Request No:</span><p className="font-medium">{selectedRequest.request_no || "-"}</p></div>
                <div><span className="text-muted-foreground">Driver:</span><p className="font-medium">{selectedRequest.driver_id} - {selectedRequest.driver_name || "N/A"}</p></div>
                <div><span className="text-muted-foreground">Type:</span><p className="font-medium">{getRequestTypeLabel(selectedRequest.request_type)}</p></div>
                <div><span className="text-muted-foreground">Status:</span><div>{getStatusBadge(selectedRequest.status)}</div></div>
              </div>
              {controllerMap[selectedRequest.driver_id] && <p className="text-xs text-muted-foreground">Controller: {controllerMap[selectedRequest.driver_id]}</p>}
              
              {isFleetUser ? (
                <div className="space-y-3">
                  <div><Label>Fleet Remarks</Label><Textarea value={fleetRemarks} onChange={(e) => setFleetRemarks(e.target.value)} placeholder="Add fleet remarks..." rows={3} /></div>
                  {selectedRequest.admin_response && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground mb-1">Admin Response:</p><p className="text-sm">{selectedRequest.admin_response}</p></div>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div><Label>Subject</Label><Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} /></div>
                  <div><Label>Description</Label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} /></div>
                  <div><Label>Update Status</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Admin Response</Label><Textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Type your response..." rows={3} /></div>
                  {selectedRequest.fleet_remarks && <div className="bg-amber-50 rounded-lg p-3 border border-amber-200"><p className="text-xs text-amber-600 mb-1">Fleet Remarks:</p><p className="text-sm">{selectedRequest.fleet_remarks}</p></div>}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button onClick={isFleetUser ? handleFleetRemarksSubmit : handleSubmitResponse} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isFleetUser ? "Save Remarks" : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmRequest} onOpenChange={(open) => !open && setDeleteConfirmRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Request?</AlertDialogTitle><AlertDialogDescription>This will permanently delete request {deleteConfirmRequest?.request_no}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Types Dialog */}
      {showTypesDialog && (
        <Suspense fallback={null}>
          <ManageTypesDialog open={showTypesDialog} onOpenChange={setShowTypesDialog} />
        </Suspense>
      )}
    </PageLayout>
  );
};

export default AdminRequestsPage;
