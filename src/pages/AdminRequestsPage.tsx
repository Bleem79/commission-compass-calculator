import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, X, MessageSquare, Loader2, Clock, CheckCircle, XCircle, 
  Search, Filter, Send, ChevronDown, RefreshCw, AlertCircle, Settings, Plus, Trash2, CalendarDays, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";

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

const DEFAULT_REQUEST_TYPES = [
  { value: "single_to_double", label: "Single to Double" },
  { value: "double_to_single", label: "Double to Single" },
  { value: "cng_to_hybrid", label: "CNG to Hybrid" },
  { value: "day_off", label: "Day Off" },
  { value: "other", label: "Other" },
];

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
  const [filteredRequests, setFilteredRequests] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Response dialog
  const [selectedRequest, setSelectedRequest] = useState<DriverRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Request types management
  const [requestTypes, setRequestTypes] = useState(() => {
    const saved = localStorage.getItem("driver_request_types");
    return saved ? JSON.parse(saved) : DEFAULT_REQUEST_TYPES;
  });
  const [showTypesDialog, setShowTypesDialog] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState("");
  const [newTypeLabel, setNewTypeLabel] = useState("");

  // Delete confirmation
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<DriverRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
        
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
  }, [user?.id, navigate]);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!isAdmin) return;

      try {
        const { data, error } = await supabase
          .from("driver_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRequests(data || []);
        setFilteredRequests(data || []);
      } catch (error: any) {
        console.error("Error fetching requests:", error);
        toast.error("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [isAdmin]);

  useEffect(() => {
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

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.request_type === typeFilter);
    }

    setFilteredRequests(filtered);
  }, [requests, searchQuery, statusFilter, typeFilter]);

  const handleClose = () => {
    navigate("/home");
  };

  const handleRefresh = async () => {
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
      console.error("Error refreshing requests:", error);
      toast.error("Failed to refresh requests");
    } finally {
      setLoading(false);
    }
  };

  const openResponseDialog = (request: DriverRequest) => {
    setSelectedRequest(request);
    setResponseText(request.admin_response || "");
    setNewStatus(request.status);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !user?.id) return;

    setSubmitting(true);
    try {
      const updateData: any = {
        status: newStatus,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      };

      if (responseText.trim()) {
        updateData.admin_response = responseText.trim();
      }

      const { error } = await supabase
        .from("driver_requests")
        .update(updateData)
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Update local state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, ...updateData }
            : r
        )
      );

      setSelectedRequest(null);
      setResponseText("");
      setNewStatus("");
      toast.success("Request updated successfully");
    } catch (error: any) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    const Icon = status === "pending" ? Clock : 
                 status === "approved" ? CheckCircle : 
                 status === "rejected" ? XCircle : 
                 status === "in_progress" ? Loader2 : AlertCircle;

    return (
      <Badge className={`${statusOption?.color || "bg-gray-500"} text-white`}>
        <Icon className={`h-3 w-3 mr-1 ${status === "in_progress" ? "animate-spin" : ""}`} />
        {statusOption?.label || status}
      </Badge>
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

  const getRequestTypeLabel = (value: string) => {
    return requestTypes.find((t: { value: string; label: string }) => t.value === value)?.label || value;
  };

  const handleAddRequestType = () => {
    if (!newTypeValue.trim() || !newTypeLabel.trim()) {
      toast.error("Please enter both value and label");
      return;
    }

    const valueFormatted = newTypeValue.toLowerCase().replace(/\s+/g, "_");
    
    if (requestTypes.some((t: { value: string }) => t.value === valueFormatted)) {
      toast.error("This request type already exists");
      return;
    }

    const updatedTypes = [...requestTypes, { value: valueFormatted, label: newTypeLabel.trim() }];
    setRequestTypes(updatedTypes);
    localStorage.setItem("driver_request_types", JSON.stringify(updatedTypes));
    setNewTypeValue("");
    setNewTypeLabel("");
    toast.success("Request type added successfully");
  };

  const handleDeleteRequestType = (value: string) => {
    const updatedTypes = requestTypes.filter((t: { value: string }) => t.value !== value);
    setRequestTypes(updatedTypes);
    localStorage.setItem("driver_request_types", JSON.stringify(updatedTypes));
    toast.success("Request type deleted");
  };

  const handleDeleteRequest = async () => {
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
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

  // Calculate day off counts per day for the calendar
  const dayOffCountsByDate = useMemo(() => {
    const counts: Record<string, { total: number; approved: number; pending: number }> = {};
    
    requests
      .filter((r) => r.request_type === "day_off")
      .forEach((r) => {
        const dateStr = format(new Date(r.created_at), "yyyy-MM-dd");
        if (!counts[dateStr]) {
          counts[dateStr] = { total: 0, approved: 0, pending: 0 };
        }
        counts[dateStr].total++;
        if (r.status === "approved") {
          counts[dateStr].approved++;
        } else if (r.status === "pending") {
          counts[dateStr].pending++;
        }
      });
    
    return counts;
  }, [requests]);

  // Get days in current calendar month
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  // Get the starting day of week offset (0 = Sunday)
  const startingDayOffset = useMemo(() => {
    return startOfMonth(calendarMonth).getDay();
  }, [calendarMonth]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "approved" || r.status === "rejected").length,
    dayOff: requests.filter((r) => r.request_type === "day_off").length,
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/50 to-cyan-100/50 p-4 sm:p-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-foreground">Driver Requests Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCalendar(!showCalendar)} variant={showCalendar ? "default" : "outline"}>
              <CalendarDays className="h-4 w-4 mr-2" />
              Day Off Calendar
            </Button>
            <Button onClick={handleRefresh} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Day Off Calendar */}
        {showCalendar && (
          <Card className="mb-6 bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  Day Off Requests Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(calendarMonth, "MMMM yyyy")}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: startingDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20" />
                ))}
                {/* Day cells */}
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const counts = dayOffCountsByDate[dateStr];
                  const hasRequests = counts && counts.total > 0;
                  
                  return (
                    <div
                      key={dateStr}
                      className={`h-16 sm:h-20 p-1 rounded-lg border transition-colors ${
                        isToday(day) ? "border-blue-500 bg-blue-50" : 
                        hasRequests ? "border-border bg-muted/30" : "border-border/50"
                      }`}
                    >
                      <div className={`text-xs font-medium ${isToday(day) ? "text-blue-600" : "text-foreground"}`}>
                        {format(day, "d")}
                      </div>
                      {hasRequests && (
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-green-700">{counts.approved}</span>
                          </div>
                          {counts.pending > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-xs text-yellow-700">{counts.pending}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Approved</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Pending</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Requests</div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="text-sm text-yellow-700">Pending</div>
              <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm text-blue-700">In Progress</div>
              <div className="text-2xl font-bold text-blue-800">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="text-sm text-green-700">Resolved</div>
              <div className="text-2xl font-bold text-green-800">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="text-sm text-purple-700">Day Off</div>
              <div className="text-2xl font-bold text-purple-800">{stats.dayOff}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by driver ID, name, subject, or request no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Request Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {requestTypes.map((type: { value: string; label: string }) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setShowTypesDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Types
              </Button>
            </div>
          </CardContent>
        </Card>

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
                {requests.length === 0
                  ? "No driver requests have been submitted yet."
                  : "No requests match your current filters."}
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
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold text-foreground">
                          {request.subject}
                        </CardTitle>
                        {request.request_no && (
                          <Badge variant="secondary" className="text-xs font-mono bg-blue-100 text-blue-700">
                            {request.request_no}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getRequestTypeLabel(request.request_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Driver: {request.driver_name || request.driver_id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {formatDate(request.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.request_type === "day_off" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmRequest(request);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                  {request.admin_response && (
                    <div className="mt-2 text-xs text-blue-600">
                      ✓ Response provided
                    </div>
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
              {/* Request Details */}
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
                <div>
                  <div className="text-muted-foreground text-sm mb-1">Subject:</div>
                  <div className="font-medium">{selectedRequest.subject}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm mb-1">Description:</div>
                  <div className="text-sm bg-background rounded p-3">{selectedRequest.description}</div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <Label htmlFor="status">Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
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

              {/* Response */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {responseText.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={submitting || !newStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Save Response
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Request Types Dialog */}
      <Dialog open={showTypesDialog} onOpenChange={setShowTypesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Manage Request Types
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new type form */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Add New Request Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="Value (e.g. leave_request)"
                    value={newTypeValue}
                    onChange={(e) => setNewTypeValue(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Label (e.g. Leave Request)"
                    value={newTypeLabel}
                    onChange={(e) => setNewTypeLabel(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleAddRequestType} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Request Type
              </Button>
            </div>

            {/* Existing types list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <Label className="text-sm font-medium">Existing Types ({requestTypes.length})</Label>
              {requestTypes.map((type: { value: string; label: string }) => (
                <div
                  key={type.value}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{type.value}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRequestType(type.value)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmRequest} onOpenChange={() => setDeleteConfirmRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Day Off Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this day off request from{" "}
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
            <AlertDialogAction
              onClick={handleDeleteRequest}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRequestsPage;
